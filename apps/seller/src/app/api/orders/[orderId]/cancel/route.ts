import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { assertSellerOwnsOrder } from '@/lib/order-ownership'

export const runtime = 'nodejs'

/**
 * Henüz kargolanmamış siparişi satıcı iptal eder (stok yok, gönderemiyorum vb.).
 * Kargolanmış siparişte önce kargo iptal edilir: DELETE /api/orders/:id/shipment
 * (o da siparişi iptal eder).
 *
 * Para iadesi burada YAPILMAZ: orders.status='cancelled' olunca DB trigger'ı
 * refund_status='pending' yazar, admin /api/iyzico/process-refunds (pg_cron)
 * iyzico'da iptal/iadeyi yapar ve müşteriye "İadeniz yapıldı" bildirimi gider.
 */
export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

    const ownership = await assertSellerOwnsOrder(supabase, auth.user.id, params.orderId)
    if (!ownership.ok) return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim().slice(0, 300) || 'Satıcı iptali'

    const service: any = createServiceRoleClient()
    const { data: order } = await service
      .from('orders')
      .select('id, status, payment_status, order_items(store_id), order_shipments(id, tracking_number, status)')
      .eq('id', params.orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

    if (['cancelled', 'refunded'].includes(order.status)) {
      return NextResponse.json({ error: 'Sipariş zaten iptal edilmiş' }, { status: 400 })
    }
    if (['shipped', 'delivered'].includes(order.status)) {
      return NextResponse.json({ error: 'Kargolanmış sipariş — önce kargoyu iptal edin' }, { status: 400 })
    }
    const activeShipment = (order.order_shipments || []).find(
      (s: any) => s.tracking_number && !['failed', 'returned'].includes(s.status)
    )
    if (activeShipment) {
      return NextResponse.json({ error: 'Bu siparişin kargo kaydı var — önce kargoyu iptal edin' }, { status: 400 })
    }
    // Çok satıcılı siparişi tek satıcı iptal edemez (diğer satıcıların ürünleri de iade olur)
    const stores = new Set((order.order_items || []).map((i: any) => i.store_id).filter(Boolean))
    if (stores.size > 1) {
      return NextResponse.json(
        { error: 'Bu sipariş birden fazla satıcı içeriyor — iptal için destek ekibine yazın' },
        { status: 400 }
      )
    }

    const { error } = await service
      .from('orders')
      .update({ status: 'cancelled', cancelled_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', params.orderId)
      .not('status', 'in', '(cancelled,refunded,shipped,delivered)')
    if (error) throw error

    return NextResponse.json({ success: true, refundQueued: order.payment_status === 'paid' })
  } catch (e: any) {
    console.error('[order cancel]', e)
    return NextResponse.json({ error: e.message || 'Sipariş iptal edilemedi' }, { status: 500 })
  }
}
