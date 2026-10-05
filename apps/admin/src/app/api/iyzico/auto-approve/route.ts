import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// iyzico pazaryeri otomatik onay (pg_cron, 30 dk'da bir).
//
// Onay verilen kalemin parası satıcının IBAN'ına gider; onaydan sonra satıcı
// tutarı değiştirilemez. Bu yüzden sipariş başına:
//   1. Teslimden itibaren 14 günlük yasal iade süresi dolmuş olmalı ve açık
//      (pending/approved) iade talebi olmamalı. Teslim tarihi yoksa: sipariş
//      30 gün önce verilmiş ve kargolanmış olmalı (eski davranış, yedek).
//   2. MNG faturasındaki gerçek kargo bedeli onaydan ÖNCE iyzico'da satıcı
//      tutarından düşülür (PUT /payment/item) — önce kargo kaleminden, sonra
//      ürün kalemlerinden. Fatura henüz gelmediyse teslimden sonra
//      CARGO_INVOICE_WAIT_DAYS gün beklenir, sonra kargo düşülmeden onaylanır.
//   3. Bekleyen tüm kırılımlar (ürünler + kargo) onaylanır.

const RETURN_WINDOW_DAYS = 14
const FALLBACK_DAYS_WITHOUT_DELIVERY = 30
const CARGO_INVOICE_WAIT_DAYS = 30
const MIN_SUB_MERCHANT_PRICE = 0.01 // iyzico subMerchantPrice > 0 olmalı

const DAY_MS = 24 * 60 * 60 * 1000

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
  const now = Date.now()
  // En erken uygun olabilecek sipariş: teslim + 14 gün → en az 14 gün önce verilmiş
  const createdCutoff = new Date(now - RETURN_WINDOW_DAYS * DAY_MS).toISOString()

  const { data: orders, error } = await service
    .from('orders')
    .select(`
      id, order_number, created_at, delivered_at, status,
      iyzico_shipping_transaction_id, iyzico_shipping_sub_merchant_key,
      iyzico_shipping_seller_amount, iyzico_shipping_approval_status,
      iyzico_cargo_deducted_at,
      order_items!inner ( id, seller_amount, iyzico_payment_transaction_id, iyzico_approval_status, iyzico_sub_merchant_key ),
      order_shipments ( cargo_fee ),
      return_requests ( status )
    `)
    .eq('payment_status', 'paid')
    .lt('created_at', createdCutoff)
    .eq('order_items.iyzico_approval_status', 'pending')
    .not('order_items.iyzico_payment_transaction_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[iyzico auto-approve] DB hatası:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, approved: 0, message: 'Onaylanacak kalem yok' })
  }

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  let approved = 0
  let failed = 0
  const skipped: { order: string; reason: string }[] = []
  const failures: { order: string; error: string }[] = []
  const cargoDeductions: { order: string; fee: number; deducted: number }[] = []

  for (const order of orders as any[]) {
    const orderNo = order.order_number || order.id

    // 1. İade süresi / açık iade
    const deliveredAt = order.delivered_at ? new Date(order.delivered_at).getTime() : null
    const eligible = deliveredAt
      ? now - deliveredAt >= RETURN_WINDOW_DAYS * DAY_MS
      : now - new Date(order.created_at).getTime() >= FALLBACK_DAYS_WITHOUT_DELIVERY * DAY_MS &&
        ['shipped', 'delivered'].includes(order.status)
    if (!eligible) continue

    const openReturn = (order.return_requests || []).some((r: any) => ['pending', 'approved'].includes(r.status))
    if (openReturn) {
      skipped.push({ order: orderNo, reason: 'açık iade talebi' })
      continue
    }

    // 2. Kargo bedelini onaydan önce satıcı tutarından düş
    if (!order.iyzico_cargo_deducted_at) {
      const fees = (order.order_shipments || []).map((s: any) => s.cargo_fee).filter((f: any) => f != null)
      const fee = round2(fees.reduce((a: number, f: any) => a + Number(f), 0))

      if (fees.length === 0) {
        const waited = deliveredAt ? now - deliveredAt >= CARGO_INVOICE_WAIT_DAYS * DAY_MS : true
        if (!waited) {
          skipped.push({ order: orderNo, reason: 'MNG kargo faturası bekleniyor' })
          continue
        }
        console.warn(`[iyzico auto-approve] ${orderNo}: kargo faturası bulunamadı, kargo düşülmeden onaylanıyor`)
      } else if (fee > 0) {
        // Hedefler: önce kargo kalemi, sonra ürün kalemleri (büyükten küçüğe)
        const targets: { kind: 'shipping' | 'item'; txId: string; key: string; price: number }[] = []
        if (
          order.iyzico_shipping_transaction_id &&
          order.iyzico_shipping_sub_merchant_key &&
          order.iyzico_shipping_approval_status === 'pending' &&
          Number(order.iyzico_shipping_seller_amount) > 0
        ) {
          targets.push({
            kind: 'shipping',
            txId: order.iyzico_shipping_transaction_id,
            key: order.iyzico_shipping_sub_merchant_key,
            price: Number(order.iyzico_shipping_seller_amount),
          })
        }
        for (const it of [...order.order_items].sort((a: any, b: any) => Number(b.seller_amount) - Number(a.seller_amount))) {
          if (it.iyzico_sub_merchant_key && Number(it.seller_amount) > 0) {
            targets.push({ kind: 'item', txId: it.iyzico_payment_transaction_id, key: it.iyzico_sub_merchant_key, price: Number(it.seller_amount) })
          }
        }

        let remaining = fee
        let deducted = 0
        let updateFailed = false
        for (const t of targets) {
          if (remaining <= 0) break
          const take = round2(Math.min(remaining, t.price - MIN_SUB_MERCHANT_PRICE))
          if (take <= 0) continue
          try {
            const res = await call(iyzipay, 'paymentItem', 'update', {
              locale: 'tr',
              conversationId: `cargo_${String(order.id).slice(0, 8)}_${Date.now()}`,
              paymentTransactionId: t.txId,
              subMerchantKey: t.key,
              subMerchantPrice: round2(t.price - take).toFixed(2),
            })
            if (res.status !== 'success') {
              updateFailed = true
              failures.push({ order: orderNo, error: `kargo düşümü (${t.kind} ${t.txId}): ${res.errorMessage || res.errorCode}` })
              break
            }
            remaining = round2(remaining - take)
            deducted = round2(deducted + take)
            if (t.kind === 'shipping') {
              await service.from('orders').update({ iyzico_shipping_seller_amount: round2(t.price - take) } as any).eq('id', order.id)
            }
          } catch (err: any) {
            updateFailed = true
            failures.push({ order: orderNo, error: `kargo düşümü (${t.kind} ${t.txId}): ${err?.message || 'hata'}` })
            break
          }
        }

        // Kısmi düşüm olsa bile kaydet — tekrar çalışmada aynı bedel ikinci kez düşülmesin
        await service
          .from('orders')
          .update({ iyzico_cargo_deducted_amount: deducted, iyzico_cargo_deducted_at: new Date().toISOString() } as any)
          .eq('id', order.id)
        cargoDeductions.push({ order: orderNo, fee, deducted })
        if (remaining > 0) {
          console.warn(`[iyzico auto-approve] ${orderNo}: kargo bedelinin ${remaining.toFixed(2)} TL'si satıcı tutarından düşülemedi`)
        }
        if (updateFailed) {
          failed++
          continue // tutar doğrulanmadan onay verme; sonraki çalışmada kargo düşülmeden onaylanır, logu incele
        }
      }
    }

    // 3. Onay: ürün kalemleri + kargo kalemi
    const toApprove: { kind: 'item' | 'shipping'; id: string; txId: string }[] = order.order_items.map((it: any) => ({
      kind: 'item' as const,
      id: it.id,
      txId: it.iyzico_payment_transaction_id,
    }))
    if (order.iyzico_shipping_transaction_id && order.iyzico_shipping_approval_status === 'pending') {
      toApprove.push({ kind: 'shipping', id: order.id, txId: order.iyzico_shipping_transaction_id })
    }

    for (const a of toApprove) {
      try {
        const res = await call(iyzipay, 'approval', 'create', {
          locale: 'tr',
          conversationId: `auto_${a.id.slice(0, 8)}_${Date.now()}`,
          paymentTransactionId: a.txId,
        })
        if (res.status === 'success') {
          const nowIso = new Date().toISOString()
          if (a.kind === 'item') {
            await service.from('order_items').update({ iyzico_approval_status: 'approved', iyzico_approved_at: nowIso } as any).eq('id', a.id)
          } else {
            await service.from('orders').update({ iyzico_shipping_approval_status: 'approved' } as any).eq('id', a.id)
          }
          approved++
        } else {
          failed++
          failures.push({ order: orderNo, error: `onay (${a.kind} ${a.txId}): ${res.errorMessage || res.errorCode}` })
        }
      } catch (err: any) {
        failed++
        failures.push({ order: orderNo, error: `onay (${a.kind} ${a.txId}): ${err?.message || 'hata'}` })
      }
    }
  }

  console.log(`[iyzico auto-approve] ${approved} onaylandı, ${failed} başarısız, ${skipped.length} atlandı`)
  return NextResponse.json({
    ok: true,
    approved,
    failed,
    ...(cargoDeductions.length > 0 && { cargoDeductions }),
    ...(skipped.length > 0 && { skipped }),
    ...(failures.length > 0 && { failures }),
  })
}
