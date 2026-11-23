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
//   1. Hak disputed olmalı ve callback'in sakladığı iyzico paymentId bulunmalı.
//   2. Önce tüm ödeme iptal edilir (gün sonu öncesi). iyzico iptali onaylarsa biter.
//   3. İptal reddedilirse ödeme detayı alınır; yalnız paymentStatus=SUCCESS olan
//      tahsilatın kalemleri iade edilir. Her başarılı kalem dispute_progress'e
//      yazılır, yeniden denemede tekrar iade edilmez.
//   4. Tamamı iyzico'da başarılıysa complete_bilgoo_dispute_refund: sipariş
//      refunded, hak void. Herhangi bir adım başarısızsa sipariş disputed kalır.
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
  const { data: a } = await service
    .from('bilgoo_coupon_attempts')
    .select('state, iyzico_payment_id, dispute_progress, orders!inner(order_number, payment_status)')
    .eq('order_id', orderId)
    .maybeSingle()
  if (!a || a.state !== 'disputed' || a.orders?.payment_status !== 'disputed') {
    return NextResponse.json({ error: 'Kayıt açık bir BILGOO ihtilafı değil' }, { status: 409 })
  }
  if (!a.iyzico_payment_id) {
    return NextResponse.json({ error: 'iyzico ödeme referansı yok; iyzico panelinden elle incelenmeli' }, { status: 409 })
  }

  const orderNumber = a.orders.order_number
  const paymentId = a.iyzico_payment_id
  const progress: any = { ...(a.dispute_progress || {}) }
  progress.items = progress.items || {}
  progress.log = progress.log || []
  const save = () => service.from('bilgoo_coupon_attempts').update({ dispute_progress: progress }).eq('order_id', orderId)
  const log = (text: string) => { progress.log = [...progress.log, { at: new Date().toISOString(), by: auth.userId, text }].slice(-20) }

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  const finish = async (method: 'cancel' | 'refund', amount: number) => {
    const { data: done, error } = await service.rpc('complete_bilgoo_dispute_refund', {
      p_order_id: orderId, p_amount: amount, p_method: method,
      p_reason: `${auth.userId}: ${note}`.slice(0, 200),
    })
    if (error) {
      log(`iyzico ${method} başarılı ama veritabanı güncellenemedi: ${error.message}`)
      await save()
      return NextResponse.json({ error: `iyzico ${method} başarılı, veritabanı güncellenemedi: ${error.message}` }, { status: 500 })
    }
    await save()
    return NextResponse.json({ ok: true, method, amount, closed: done === true })
  }

  try {
    if (Object.keys(progress.items).length === 0 && !progress.cancelRejected) {
      const c = await call(iyzipay, 'cancel', 'create', {
        locale: 'tr', conversationId: `bilgoo_dispute_cancel_${orderNumber}`, paymentId, ip: IP,
      })
      if (c?.status === 'success') {
        progress.cancel = { at: new Date().toISOString(), price: c.price, paymentId: c.paymentId }
        log('iyzico iptal başarılı')
        return await finish('cancel', round2(Number(c.price)))
      }
      progress.cancelRejected = { at: new Date().toISOString(), error: iyzErr(c) }
      log(`iyzico iptal reddedildi: ${iyzErr(c)}`)
      await save()
    }

    const p = await call(iyzipay, 'payment', 'retrieve', {
      locale: 'tr', conversationId: `bilgoo_dispute_detail_${orderNumber}`, paymentId,
    })
    if (p?.status !== 'success' || p.paymentStatus !== 'SUCCESS' || !Array.isArray(p.itemTransactions)) {
      log(`ödeme detayı tahsilatı doğrulamadı: ${iyzErr(p)}`)
      await save()
      return NextResponse.json({ error: `iyzico tahsilatı doğrulanamadı: ${iyzErr(p)}` }, { status: 409 })
    }

    let total = 0
    for (const it of p.itemTransactions) {
      const txId = String(it.paymentTransactionId)
      const amount = round2(Number(it.paidPrice))
      if (!(amount > 0)) continue
      if (progress.items[txId]) { total += progress.items[txId].amount; continue }
      const r = await call(iyzipay, 'refund', 'create', {
        locale: 'tr', conversationId: `bilgoo_dispute_refund_${orderNumber}_${txId}`,
        paymentTransactionId: txId, price: amount.toFixed(2), currency: 'TRY', ip: IP,
      })
      if (r?.status !== 'success') {
        log(`kalem iadesi başarısız (${it.itemId || txId}): ${iyzErr(r)}`)
        await save()
        return NextResponse.json({ error: `Kalem iadesi başarısız: ${iyzErr(r)}` }, { status: 502 })
      }
      progress.items[txId] = { amount, at: new Date().toISOString(), itemId: it.itemId }
      total += amount
      await save()
    }
    log(`kalem iadeleri tamamlandı: ${round2(total)} TL`)
    return await finish('refund', round2(total))
  } catch (e: any) {
    log(`hata: ${String(e?.message || e).slice(0, 200)}`)
    await save()
    return NextResponse.json({ error: 'iyzico isteği başarısız; ihtilaf açık kaldı' }, { status: 502 })
  }
}
