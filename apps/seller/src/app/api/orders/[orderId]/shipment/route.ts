import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ShipmentStatus =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'

function generateMockTrackingNumber(orderNumber?: string) {
  const base = (orderNumber || 'NS').replace(/[^A-Z0-9]/gi, '').slice(-6)
  const rand = Math.random().toString(36).toUpperCase().slice(2, 8)
  return `MOCK-${base}-${rand}`
}

function buildTrackingUrl(template: string | null | undefined, trackingNumber: string) {
  if (!template) return null
  return template.replace('{tracking_number}', encodeURIComponent(trackingNumber))
}

async function assertSellerOwnsOrder(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, orderId: string) {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (storeError) throw storeError
  if (!store?.id) return { ok: false as const, storeId: null }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('store_id', store.id)
    .limit(1)

  if (itemsError) throw itemsError
  return { ok: (items?.length ?? 0) > 0, storeId: store.id }
}

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()

    const {
      carrierId,
      methodId,
      provider = 'mock',
      weight = 1,
      pieceCount = 1,
      createLabel = true,
      trackingNumber: manualTrackingNumber,
    } = await request.json()

    if (!carrierId || !methodId) {
      return NextResponse.json({ error: 'carrierId ve methodId zorunludur' }, { status: 400 })
    }

    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user

    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const orderId = params.orderId
    const ownership = await assertSellerOwnsOrder(supabase, user.id, orderId)
    if (!ownership.ok) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, subtotal, shipping_cost, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    const { data: existingShipment } = await supabase
      .from('order_shipments')
      .select('id, tracking_number')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existingShipment?.tracking_number) {
      return NextResponse.json({ error: 'Bu sipariş zaten kargoya verilmiş' }, { status: 400 })
    }

    const { data: carrier } = await supabase
      .from('shipping_carriers')
      .select('tracking_url_template')
      .eq('id', carrierId)
      .maybeSingle()

    let trackingNumber: string | null = null
    let labelUrl: string | null = null

    if (createLabel) {
      const tn = manualTrackingNumber || generateMockTrackingNumber(order.order_number)
      trackingNumber = tn
      labelUrl = `https://example.com/mock-labels/${encodeURIComponent(tn)}.pdf`
    }

    const trackingUrl = trackingNumber
      ? buildTrackingUrl(carrier?.tracking_url_template, trackingNumber)
      : null

    let shippingCost = Number(order.shipping_cost || 0)
    try {
      const { data } = await supabase.rpc('calculate_shipping_cost' as any, {
        p_store_id: ownership.storeId,
        p_method_id: methodId,
        p_order_value: Number(order.subtotal || 0),
        p_weight: Number(weight || 1),
        p_region: 'all',
      })
      if (data !== null && data !== undefined) shippingCost = Number(data)
    } catch { /* ignore */ }

    const status: ShipmentStatus = trackingNumber ? 'shipped' : 'preparing'

    const shipmentData = {
      order_id: orderId,
      carrier_id: carrierId,
      method_id: methodId,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      status,
      package_weight: Number(weight || 1),
      shipping_cost: shippingCost,
      shipping_label_url: labelUrl,
      shipped_at: trackingNumber ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    let shipment
    if (existingShipment?.id) {
      const { data, error } = await supabase
        .from('order_shipments')
        .update(shipmentData)
        .eq('id', existingShipment.id)
        .select()
        .single()
      if (error) throw error
      shipment = data
    } else {
      const { data, error } = await supabase
        .from('order_shipments')
        .insert(shipmentData)
        .select()
        .single()
      if (error) throw error
      shipment = data
    }

    try {
      await supabase.from('shipping_status_history').insert({
        shipment_id: shipment.id,
        status,
        location: 'Sistem',
        description: provider === 'mock' ? 'Mock kargo kaydı oluşturuldu' : 'Kargo kaydı oluşturuldu',
        timestamp: new Date().toISOString(),
      })
    } catch { /* ignore */ }

    await supabase
      .from('orders')
      .update({
        status: trackingNumber ? 'shipped' : 'processing',
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({ success: true, shipment, cargoApiResult: { trackingNumber, labelUrl } })
  } catch (error: any) {
    console.error('Create shipment error:', error)
    return NextResponse.json({ error: error.message || 'Kargo bilgisi kaydedilemedi' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const ownership = await assertSellerOwnsOrder(supabase, user.id, params.orderId)
    if (!ownership.ok) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const { data: shipment, error } = await supabase
      .from('order_shipments')
      .select(`*, carrier:shipping_carriers(*), method:shipping_methods(*), history:shipping_status_history(*)`)
      .eq('order_id', params.orderId)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ shipment: shipment || null })
  } catch (error: any) {
    console.error('Get shipment error:', error)
    return NextResponse.json({ error: error.message || 'Kargo bilgisi alınamadı' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const ownership = await assertSellerOwnsOrder(supabase, user.id, params.orderId)
    if (!ownership.ok) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json()
    const nextStatus = body.status as ShipmentStatus
    const location = (body.location as string | undefined) || null
    const description = (body.description as string | undefined) || null

    if (!nextStatus) {
      return NextResponse.json({ error: 'status zorunludur' }, { status: 400 })
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('order_shipments')
      .select('id')
      .eq('order_id', params.orderId)
      .single()

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Kargo kaydı bulunamadı' }, { status: 404 })
    }

    const update: any = { status: nextStatus, updated_at: new Date().toISOString() }
    if (nextStatus === 'delivered') update.delivered_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('order_shipments')
      .update(update)
      .eq('id', shipment.id)
      .select()
      .single()

    if (updateError) throw updateError

    try {
      await supabase.from('shipping_status_history').insert({
        shipment_id: shipment.id,
        status: nextStatus,
        location,
        description,
        timestamp: new Date().toISOString(),
      })
    } catch { /* ignore */ }

    const orderStatus = nextStatus === 'delivered' ? 'delivered' : nextStatus === 'shipped' ? 'shipped' : null
    if (orderStatus) {
      await supabase
        .from('orders')
        .update({ status: orderStatus, updated_at: new Date().toISOString() })
        .eq('id', params.orderId)
    }

    return NextResponse.json({ success: true, shipment: updated })
  } catch (error: any) {
    console.error('Update shipment status error:', error)
    return NextResponse.json({ error: error.message || 'Kargo durumu güncellenemedi' }, { status: 500 })
  }
}
