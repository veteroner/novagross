import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// İptal edilen ödenmiş siparişlerin iyzico iadesi (pg_cron, 2 dk'da bir).
//
// orders.refund_status='pending' satırını DB trigger'ı (queue_refund_on_cancel)
// iptal anında yazar — iptal satıcı webinden, mobilden ya da admin'den gelebilir.
// Sipariş başına:
//   1. Satır 'processing' olarak kilitlenir (aynı sipariş iki kez işlenmez).
//   2. Önce ödeme iptali (cancel) denenir: gün sonu mutabakatı olmadıysa tüm
//      ödeme tek seferde iptal olur, satıcıya hiç para geçmez.
//   3. İptal reddedilirse kalem kalem iade (refund) — her başarılı kalem anında
//      iyzico_refund_response.items'a yazılır; yeniden denemede atlanır (çift iade yok).
//   4. Tamamı başarılıysa complete_order_refund(): payment_status='refunded',
//      defter ters kaydı, müşteriye "İadeniz yapıldı" bildirimi.
//   5. Hata: refund_status='failed' + refund_error; artan aralıklarla
//      MAX_ATTEMPTS kez denenir, sonra admin elle çözer.

const MAX_ATTEMPTS = 5
const BATCH = 10
const IP = '127.0.0.1'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IYZICO_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function call(iyzipay: any, resource: string, method: string, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    iyzipay[resource][method](request, (err: any, res: any) => (err ? reject(err) : resolve(res)))
  })
}

const round2 = (n: number) => Math.round(n * 100) / 100
const iyzErr = (r: any) => [r?.errorCode, r?.errorMessage].filter(Boolean).join(' — ') || 'iyzico hata mesajı dönmedi'

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  if (!apiKey || !secretKey) {
    return NextResponse.json({ ok: false, error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
  }

  const service: any = createServiceRoleClient()
  const { data: queue, error } = await service
    .from('orders')
    .select('id, order_number, total, payment_status, refund_status, refund_attempts, refund_last_attempt_at, iyzico_refund_response')
    .in('refund_status', ['pending', 'failed'])
    .eq('payment_status', 'paid')
    .lt('refund_attempts', MAX_ATTEMPTS)
    .order('refund_requested_at', { ascending: true })
    .limit(BATCH)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  const results: any[] = []
  const now = Date.now()

  for (const o of (queue || []) as any[]) {
    // Başarısız denemeler arasında artan bekleme: 10, 20, 30, 40 dk
    if (o.refund_status === 'failed' && o.refund_last_attempt_at) {
      const waitMs = o.refund_attempts * 10 * 60 * 1000
      if (now - new Date(o.refund_last_attempt_at).getTime() < waitMs) continue
    }

    // Kilitle (iyimser: refund_attempts değişmediyse)
    const { data: claimed } = await service
      .from('orders')
      .update({
        refund_status: 'processing',
        refund_attempts: o.refund_attempts + 1,
        refund_last_attempt_at: new Date().toISOString(),
      })
      .eq('id', o.id)
      .eq('refund_attempts', o.refund_attempts)
      .in('refund_status', ['pending', 'failed'])
      .select('id')
    if (!claimed?.length) continue

    const progress: any = { ...(o.iyzico_refund_response || {}) }
    progress.items = progress.items || {}
    const save = (patch: Record<string, unknown>) =>
      service.from('orders').update({ iyzico_refund_response: progress, ...patch }).eq('id', o.id)
    const fail = async (msg: string) => {
      progress.errors = [...(progress.errors || []), { at: new Date().toISOString(), msg }].slice(-10)
      await save({ refund_status: 'failed', refund_error: msg })
      console.error('[refund] başarısız', o.order_number, msg)
      results.push({ order: o.order_number, ok: false, error: msg })
    }

    try {
      const { data: pay } = await service
        .from('payments')
        .select('provider_payment_id')
        .eq('order_id', o.id)
        .eq('status', 'completed')
        .maybeSingle()
      const paymentId = pay?.provider_payment_id
      if (!paymentId) {
        await fail('iyzico paymentId bulunamadı — iyzico panelinden elle iade edip "elle iade edildi" işaretleyin')
        continue
      }

      // 2. Tüm ödemeyi iptal (yalnızca hiçbir kalem iade edilmemişse)
      if (Object.keys(progress.items).length === 0) {
        const c = await call(iyzipay, 'cancel', 'create', {
          locale: 'tr',
          conversationId: `cancel_${o.order_number}`,
          paymentId,
          ip: IP,
        })
        if (c?.status === 'success') {
          progress.cancel = { at: new Date().toISOString(), price: c.price, paymentId: c.paymentId }
          await save({})
          const { error: rpcErr } = await service.rpc('complete_order_refund', {
            p_order_id: o.id,
            p_amount: round2(Number(c.price ?? o.total)),
            p_method: 'cancel',
            p_response: progress,
          })
          if (rpcErr) await fail(`iyzico iptal BAŞARILI ama DB güncellenemedi: ${rpcErr.message}`)
          else results.push({ order: o.order_number, ok: true, method: 'cancel', amount: c.price })
          continue
        }
        progress.cancelRejected = { at: new Date().toISOString(), error: iyzErr(c) }
      }

      // 3. Kalem kalem iade — tutarlar iyzico'daki gerçek ödenen tutar (kupon dahil)
      const p = await call(iyzipay, 'payment', 'retrieve', {
        locale: 'tr',
        conversationId: `retrieve_${o.order_number}`,
        paymentId,
      })
      if (p?.status !== 'success' || !Array.isArray(p.itemTransactions)) {
        await fail(`iyzico ödeme bilgisi alınamadı: ${iyzErr(p)}`)
        continue
      }

      let itemFailed: string | null = null
      for (const it of p.itemTransactions) {
        const txId = String(it.paymentTransactionId)
        const amount = round2(Number(it.paidPrice))
        if (progress.items[txId] || !(amount > 0)) continue
        const r = await call(iyzipay, 'refund', 'create', {
          locale: 'tr',
          conversationId: `refund_${o.order_number}_${txId}`,
          paymentTransactionId: txId,
          price: amount.toFixed(2),
          currency: 'TRY',
          ip: IP,
        })
        if (r?.status === 'success') {
          progress.items[txId] = { amount, at: new Date().toISOString(), itemId: it.itemId }
          await save({}) // her kalemden sonra kaydet: yeniden denemede tekrar iade edilmez
        } else {
          itemFailed = `${it.itemId || txId}: ${iyzErr(r)}`
          break
        }
      }
      if (itemFailed) {
        await fail(`Kalem iadesi başarısız (${itemFailed})`)
        continue
      }

      const refunded = round2(Object.values(progress.items).reduce((s: number, x: any) => s + Number(x.amount || 0), 0))
      const { error: rpcErr } = await service.rpc('complete_order_refund', {
        p_order_id: o.id,
        p_amount: refunded,
        p_method: 'refund',
        p_response: progress,
      })
      if (rpcErr) await fail(`iyzico iadesi BAŞARILI ama DB güncellenemedi: ${rpcErr.message}`)
      else results.push({ order: o.order_number, ok: true, method: 'refund', amount: refunded })
    } catch (e: any) {
      await fail(`Beklenmeyen hata: ${e?.message || e}`)
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
