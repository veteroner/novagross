import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/requireAdminApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// İhtilaflı (tutar uyuşmazlığı) BILGOO siparişinin iyzico'da iptal/iadesi.
// process-refunds yalnız payment_status='paid' siparişleri işlediği için
// disputed siparişler bu yönetici rotasıyla kapanır.
//
// POST { orderId: string, note: string }
//
// Çift çağrı koruması:
//   - iyzico'ya herhangi bir çağrıdan önce claim_bilgoo_dispute ile kayıt atomik
//     kilitlenir. Kilidi alamayan istek iyzico'yu hiç çağırmaz (409).
//   - Her para hareketinden (cancel/refund) önce dispute_progress.pending'e niyet
//     yazılır. Niyet kaydedilemezse iyzico çağrılmaz.
//   - iyzico isteği reddederse (kesin sonuç) niyet silinir ve kilit bırakılır.
//   - Sonuç belirsizse (ağ hatası) ya da iyzico başarılı olup veritabanı yazımı
//     başarısızsa niyet ve kilit yerinde kalır, needs_review=true olur. Sonraki
//     çağrılar bekleyen niyeti görür ve iyzico'yu yeniden çağırmaz; yönetici
//     iyzico panelinden kontrol edip kaydı elle düzeltir.
//
// Akış: önce tam iptal (gün sonu öncesi). Reddedilirse ödeme detayı alınır; yalnız
// paymentStatus=SUCCESS olan tahsilatın henüz iade edilmemiş kalemleri iade edilir.
// Tamamı onaylanınca complete_bilgoo_dispute_refund: sipariş refunded, hak void.
//
// İhtilaflı tutarın tahsil edilmiş sayılması (kabul) bu rotada yok: tutar farkı,
// stok yeniden ayırma ve komisyon kaydı ayrı bir iş kararı gerektirir.

const IP = '127.0.0.1'

function call(iyzipay: any, resource: string, method: string, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    iyzipay[resource][method](request, (err: any, res: any) => (err ? reject(err) : resolve(res)))
  })
}
const round2 = (n: number) => Math.round(n * 100) / 100
const iyzErr = (r: any) => [r?.status, r?.paymentStatus, r?.errorCode, r?.errorMessage].filter(Boolean).join(' / ') || 'boş yanıt'

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (!orderId || note.length < 10) {
    return NextResponse.json({ error: 'orderId ve en az 10 karakterlik inceleme notu gerekli' }, { status: 400 })
  }
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
  }

  const service: any = createServiceRoleClient()
  const claimer = `${auth.userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
  const { data: claim, error: claimError } = await service.rpc('claim_bilgoo_dispute', {
    p_order_id: orderId, p_claimer: claimer,
  })
  if (claimError) return NextResponse.json({ error: `Kilit alınamadı: ${claimError.message}` }, { status: 500 })
  if (!claim?.ok) {
    const messages: Record<string, string> = {
      locked: 'Bu ihtilaf için işlem sürüyor ya da manuel inceleme bekliyor',
      no_reference: 'iyzico ödeme referansı yok; iyzico panelinden elle incelenmeli',
      not_disputed: 'Kayıt açık bir BILGOO ihtilafı değil',
    }
    return NextResponse.json({ error: messages[claim?.reason] || 'Kilit alınamadı', reason: claim?.reason }, { status: 409 })
  }

  const orderNumber: string = claim.order_number
  const paymentId: string = claim.payment_id
  const progress: any = { ...(claim.progress || {}) }
  progress.items = progress.items || {}
  progress.log = progress.log || []
  const log = (text: string) => {
    progress.log = [...progress.log, { at: new Date().toISOString(), by: auth.userId, text }].slice(-20)
  }
  // Kilidi elimizde tutarken ilerlemeyi yazar; kilit başkasındaysa yazmaz.
  const save = async (): Promise<boolean> => {
    try {
      const { data, error } = await service.from('bilgoo_coupon_attempts')
        .update({ dispute_progress: progress })
        .eq('order_id', orderId).eq('dispute_claimed_by', claimer)
        .select('order_id')
      return !error && Array.isArray(data) && data.length === 1
    } catch {
      return false
    }
  }
  const release = async () => {
    await service.from('bilgoo_coupon_attempts')
      .update({ dispute_progress: progress, dispute_claimed_at: null, dispute_claimed_by: null })
      .eq('order_id', orderId).eq('dispute_claimed_by', claimer)
  }
  // Belirsiz durum: kilit ve niyet yerinde kalır, kayıt manuel incelemeye düşer.
  const hold = async (status: number, message: string) => {
    log(`MANUEL İNCELEME: ${message}`)
    try {
      await service.from('bilgoo_coupon_attempts')
        .update({ dispute_progress: progress, needs_review: true })
        .eq('order_id', orderId).eq('dispute_claimed_by', claimer)
    } catch { /* kilit zaten tutuluyor; tekrar çağrı iyzico'ya gitmez */ }
    return NextResponse.json({ error: message, needsReview: true }, { status })
  }

  if (progress.pending) {
    // Önceki bir çağrının sonucu kaydedilmemiş: iyzico yeniden çağrılmaz.
    return hold(409, `bekleyen ${progress.pending.op} niyeti var (${progress.pending.txId ?? paymentId}); iyzico panelinden doğrulayın`)
  }

  // iyzico'ya para hareketi: önce niyet, sonra çağrı, sonra sonuç.
  const mutate = async (op: 'cancel' | 'refund', txId: string | null, req: any, resource: string) => {
    progress.pending = { op, txId, at: new Date().toISOString() }
    if (!(await save())) {
      delete progress.pending
      await release()
      return { kind: 'aborted' as const }
    }
    let res: any
    try {
      res = await call(iyzipay, resource, 'create', req)
    } catch (e: any) {
      return { kind: 'unknown' as const, error: String(e?.message || e).slice(0, 200) }
    }
    if (res?.status === 'success') return { kind: 'success' as const, res }
    if (res?.status === 'failure') {
      // Yalnız iyzico'nun açık ret yanıtı kesindir: niyet silinir.
      delete progress.pending
      return { kind: 'rejected' as const, res }
    }
    // Boş, undefined ya da tanınmayan yanıt: işlemin yapılıp yapılmadığı bilinmez.
    return { kind: 'unknown' as const, error: `tanınmayan iyzico yanıtı: ${iyzErr(res)}` }
  }

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  const finish = async (method: 'cancel' | 'refund', amount: number) => {
    const { data: done, error } = await service.rpc('complete_bilgoo_dispute_refund', {
      p_order_id: orderId, p_amount: amount, p_method: method,
      p_reason: `${auth.userId}: ${note}`.slice(0, 200),
    }).then((r: any) => r, (e: any) => ({ data: null, error: e }))
    if (error || done !== true) {
      // iyzico sonucu dispute_progress'te kayıtlı ve bekleyen niyet yok: kilit bırakılır,
      // tekrar çağrı iyzico'ya gitmeden yalnız kapanışı dener.
      log(`iyzico ${method} tamamlandı (${amount} TL) ama sipariş kapatılamadı: ${error?.message ?? 'kayıt güncellenmedi'}`)
      try {
        await service.from('bilgoo_coupon_attempts')
          .update({ dispute_progress: progress, needs_review: true, dispute_claimed_at: null, dispute_claimed_by: null })
          .eq('order_id', orderId).eq('dispute_claimed_by', claimer)
      } catch { /* kilit tutulu kalır; manuel inceleme */ }
      return NextResponse.json({ error: 'iyzico işlemi tamamlandı, sipariş kapatılamadı; tekrar deneyin', retrySafe: true, needsReview: true }, { status: 500 })
    }
    await release()
    return NextResponse.json({ ok: true, method, amount })
  }

  try {
    if (Object.keys(progress.items).length === 0 && !progress.cancelRejected && !progress.cancel) {
      const c = await mutate('cancel', null, {
        locale: 'tr', conversationId: `bilgoo_dispute_cancel_${orderNumber}`, paymentId, ip: IP,
      }, 'cancel')
      if (c.kind === 'aborted') return NextResponse.json({ error: 'İlerleme kaydedilemedi; iyzico çağrılmadı' }, { status: 503 })
      if (c.kind === 'unknown') return hold(502, `iyzico iptal sonucu belirsiz: ${c.error}`)
      if (c.kind === 'success') {
        progress.cancel = { at: new Date().toISOString(), price: c.res.price, paymentId: c.res.paymentId }
        delete progress.pending
        log('iyzico iptal başarılı')
        if (!(await save())) return hold(500, 'iyzico iptal başarılı ama ilerleme kaydedilemedi')
        return await finish('cancel', round2(Number(c.res.price)))
      }
      progress.cancelRejected = { at: new Date().toISOString(), error: iyzErr(c.res) }
      log(`iyzico iptal reddedildi: ${iyzErr(c.res)}`)
      if (!(await save())) return hold(500, 'iptal reddi kaydedilemedi')
    }
    if (progress.cancel) {
      // İptal iyzico'da başarılı, yalnız sipariş kapanışı kalmış.
      return await finish('cancel', round2(Number(progress.cancel.price)))
    }
    if (progress.refundsComplete) {
      // Kalem iadeleri iyzico'da tamamlanmış, yalnız sipariş kapanışı kalmış.
      return await finish('refund', round2(Number(progress.refundTotal)))
    }

    const p = await call(iyzipay, 'payment', 'retrieve', {
      locale: 'tr', conversationId: `bilgoo_dispute_detail_${orderNumber}`, paymentId,
    })
    if (p?.status !== 'success' || p.paymentStatus !== 'SUCCESS' || !Array.isArray(p.itemTransactions)) {
      log(`ödeme detayı tahsilatı doğrulamadı: ${iyzErr(p)}`)
      await release()
      return NextResponse.json({ error: `iyzico tahsilatı doğrulanamadı: ${iyzErr(p)}` }, { status: 409 })
    }

    let total = 0
    for (const it of p.itemTransactions) {
      const txId = String(it.paymentTransactionId)
      const amount = round2(Number(it.paidPrice))
      if (!(amount > 0)) continue
      if (progress.items[txId]) { total += progress.items[txId].amount; continue }
      const r = await mutate('refund', txId, {
        locale: 'tr', conversationId: `bilgoo_dispute_refund_${orderNumber}_${txId}`,
        paymentTransactionId: txId, price: amount.toFixed(2), currency: 'TRY', ip: IP,
      }, 'refund')
      if (r.kind === 'aborted') return NextResponse.json({ error: 'İlerleme kaydedilemedi; iyzico çağrılmadı' }, { status: 503 })
      if (r.kind === 'unknown') return hold(502, `kalem iadesi sonucu belirsiz (${it.itemId || txId}): ${r.error}`)
      if (r.kind === 'rejected') {
        log(`kalem iadesi reddedildi (${it.itemId || txId}): ${iyzErr(r.res)}`)
        await release()
        return NextResponse.json({ error: `Kalem iadesi reddedildi: ${iyzErr(r.res)}` }, { status: 502 })
      }
      progress.items[txId] = { amount, at: new Date().toISOString(), itemId: it.itemId }
      delete progress.pending
      total += amount
      if (!(await save())) return hold(500, `kalem iadesi başarılı (${txId}) ama ilerleme kaydedilemedi`)
    }
    log(`kalem iadeleri tamamlandı: ${round2(total)} TL`)
    progress.refundsComplete = true
    progress.refundTotal = round2(total)
    if (!(await save())) return hold(500, 'kalem iadeleri tamamlandı ama ilerleme kaydedilemedi')
    return await finish('refund', round2(total))
  } catch (e: any) {
    // Para hareketi dışındaki beklenmeyen hata: bekleyen niyet yoksa kilit bırakılır.
    log(`hata: ${String(e?.message || e).slice(0, 200)}`)
    if (progress.pending) return hold(502, 'beklenmeyen hata; bekleyen iyzico işlemi var')
    await release()
    return NextResponse.json({ error: 'İşlem tamamlanamadı; ihtilaf açık kaldı' }, { status: 502 })
  }
}
