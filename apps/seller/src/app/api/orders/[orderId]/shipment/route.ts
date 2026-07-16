import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargoService, type CargoProvider } from '@novagross/cargo'

export const runtime = 'nodejs'
// POST artık Standard Command deneyip başarısız olursa Plus Command'a düşüyor
// (art arda 2 MNG çağrısı + barkod çağrısı, her biri ~20sn'ye kadar sürebilir);
// varsayılan Netlify function limiti bu toplam süreyi ortasında kesebilir.
export const maxDuration = 60

type ShipmentStatus =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'

const REAL_PROVIDERS: CargoProvider[] = ['mng', 'aras', 'yurtici']

function buildTrackingUrl(template: string | null | undefined, trackingNumber: string) {
  if (!template) return null
  return template.replace('{tracking_number}', encodeURIComponent(trackingNumber))
}

async function assertSellerOwnsOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderId: string
) {
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
      .select('id, order_number, subtotal, shipping_cost, status, email, shipping_address')
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

    // Kargo firması kodu (mng/aras/yurtici) — gerçek API çağrısı için gerekli
    const { data: carrier } = await supabase
      .from('shipping_carriers')
      .select('code, tracking_url_template')
      .eq('id', carrierId)
      .maybeSingle()

    const carrierCode = (carrier?.code || '').toLowerCase() as CargoProvider

    let trackingNumber: string | null = null
    let labelUrl: string | null = null
    let barcodeData: string | null = null
    let officialBarcode: string | null = null
    let labelZpl: string | null = null
    let providerCode = carrierCode || 'manual'

    if (createLabel) {
      if (manualTrackingNumber && String(manualTrackingNumber).trim()) {
        // Manuel takip no (PTT/Sürat gibi API'siz firmalar ya da elle giriş)
        trackingNumber = String(manualTrackingNumber).trim()
        providerCode = carrierCode || 'manual'
      } else if (REAL_PROVIDERS.includes(carrierCode)) {
        // Gerçek kargo API'si ile gönderi oluştur — MOCK YOK, başarısızsa net hata
        const { data: store } = await supabase
          .from('stores')
          .select('store_name, address, city, district, phone')
          .eq('id', ownership.storeId!)
          .maybeSingle()

        const ship = (order.shipping_address as any) || {}

        if (!store?.address || !store?.city) {
          return NextResponse.json(
            { error: 'Mağaza adresi eksik. Ayarlar > Mağaza Bilgileri’nden adres girin.' },
            { status: 422 }
          )
        }
        if (!ship.address_line1 || !ship.city) {
          return NextResponse.json({ error: 'Sipariş teslimat adresi eksik.' }, { status: 422 })
        }

        const result = await cargoService.createShipment(carrierCode, {
          senderName: store.store_name,
          senderAddress: store.address,
          senderCity: store.city,
          senderDistrict: store.district || '',
          senderPhone: store.phone || '',

          receiverName: `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || 'Müşteri',
          receiverAddress: ship.address_line1,
          receiverCity: ship.city,
          receiverDistrict: ship.district || '',
          receiverPhone: ship.phone || '',
          receiverEmail: order.email || ship.email || '',

          weight: Number(weight || 1),
          pieceCount: Number(pieceCount || 1),
          paymentType: 'SENDER',
          serviceType: 'STANDARD',

          description: `Novagross Sipariş #${order.order_number}`,
          invoiceNumber: order.order_number,
          invoiceValue: Number(order.subtotal || 0),
        })

        if (!result.success || !result.trackingNumber) {
          // Sahte veri üretme — gerçek hatayı satıcıya göster
          return NextResponse.json(
            { error: result.error || `${carrierCode.toUpperCase()} gönderi oluşturamadı` },
            { status: 502 }
          )
        }

        trackingNumber = result.trackingNumber
        labelUrl = result.labelUrl || null
        providerCode = carrierCode
        const bc = await cargoService.getBarcode(carrierCode, result.trackingNumber)
        if (bc.success) {
          barcodeData = bc.barcodeBase64 || null
          officialBarcode = bc.officialBarcode || null
          labelZpl = bc.zpl || null
        }
      } else {
        // API'siz firma seçildi ve takip no girilmedi
        return NextResponse.json(
          { error: 'Bu kargo firması API ile entegre değil. Lütfen takip numarasını manuel girin.' },
          { status: 400 }
        )
      }
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
    } catch {
      /* ignore */
    }

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
      barcode_data: barcodeData,
      official_barcode: officialBarcode,
      label_zpl: labelZpl,
      provider_code: providerCode,
      shipped_at: trackingNumber ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    let shipment
    if (existingShipment?.id) {
      const { data, error } = await supabase
        .from('order_shipments')
        .update(shipmentData as any)
        .eq('id', existingShipment.id)
        .select()
        .single()
      if (error) throw error
      shipment = data
    } else {
      const { data, error } = await supabase
        .from('order_shipments')
        .insert(shipmentData as any)
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
        description: REAL_PROVIDERS.includes(carrierCode)
          ? `${carrierCode.toUpperCase()} gönderisi oluşturuldu`
          : 'Kargo kaydı oluşturuldu (manuel takip no)',
        timestamp: new Date().toISOString(),
      })
    } catch {
      /* ignore */
    }

    await supabase
      .from('orders')
      .update({
        status: trackingNumber ? 'shipped' : 'processing',
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      shipment,
      cargoApiResult: { trackingNumber, labelUrl, barcode: Boolean(barcodeData), providerCode },
    })
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

    // Resmi MNG barkodunu, gönderiyi yeniden oluşturmadan tekrar dener
    // (ilk oluşturmada hesap izni/ge​çici bir sebeple gelmemiş olabilir).
    if (body.action === 'retry_barcode') {
      const { data: shipment, error: shipmentError } = await (supabase as any)
        .from('order_shipments')
        .select('id, tracking_number, provider_code, barcode_data')
        .eq('order_id', params.orderId)
        .maybeSingle()
      if (shipmentError || !shipment) {
        return NextResponse.json({ error: 'Kargo kaydı bulunamadı' }, { status: 404 })
      }
      if (!shipment.tracking_number || !REAL_PROVIDERS.includes((shipment.provider_code || '').toLowerCase() as CargoProvider)) {
        return NextResponse.json({ error: 'Bu gönderi için resmi barkod desteklenmiyor' }, { status: 400 })
      }
      const bc = await cargoService.getBarcode(shipment.provider_code as CargoProvider, shipment.tracking_number)
      if (!bc.success || (!bc.barcodeBase64 && !bc.officialBarcode && !bc.zpl)) {
        return NextResponse.json({ error: bc.error || 'Resmi barkod alınamadı' }, { status: 502 })
      }
      const { data: updated, error: updateError } = await supabase
        .from('order_shipments')
        .update({
          barcode_data: bc.barcodeBase64 || null,
          official_barcode: bc.officialBarcode || null,
          label_zpl: bc.zpl || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', shipment.id)
        .select()
        .single()
      if (updateError) throw updateError
      return NextResponse.json({ success: true, shipment: updated })
    }

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
    } catch {
      /* ignore */
    }

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

/**
 * Kargo iptali — henüz teslim edilmemiş bir gönderi için gerçek MNG iptalini
 * çağırır (marketPlaceCancelOrder, yetkisizse cancelOrderDelivery'e düşer).
 */
export async function DELETE(request: NextRequest, { params }: { params: { orderId: string } }) {
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

    const body = await request.json().catch(() => ({}))
    const reason = (body?.reason as string | undefined) || 'Satıcı iptali'
    const force = body?.force === true

    const { data: shipment, error: shipmentError } = await (supabase as any)
      .from('order_shipments')
      .select('id, tracking_number, provider_code, status')
      .eq('order_id', params.orderId)
      .maybeSingle()

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Kargo kaydı bulunamadı' }, { status: 404 })
    }
    if (!shipment.tracking_number) {
      return NextResponse.json({ error: 'Bu gönderinin takip numarası yok' }, { status: 400 })
    }
    if (['delivered', 'failed', 'returned'].includes(shipment.status)) {
      return NextResponse.json({ error: 'Teslim edilmiş/kapanmış gönderi iptal edilemez' }, { status: 400 })
    }

    let cancelNote = `Kargo iptal edildi: ${reason}`
    const provider = (shipment.provider_code || '').toLowerCase() as CargoProvider
    if (REAL_PROVIDERS.includes(provider)) {
      const result = await cargoService.cancelShipment(provider, shipment.tracking_number, reason)
      if (!result.success) {
        if (!force) {
          // MNG API'si reddetti (örn. hesap yetki hatası) — satıcıya elle
          // iptal seçeneği sunulsun diye ham hatayı geri döndür, kaydı
          // henüz değiştirme.
          return NextResponse.json(
            { error: result.message || 'Kargo iptal edilemedi', canForce: true },
            { status: 502 }
          )
        }
        // Satıcı, kargo firmasıyla telefon/portal üzerinden manuel iletişime
        // geçtiğini onaylayarak sistemde iptal olarak işaretlenmesini istedi.
        // MNG API çağrısı başarısız kaldığı için fiziksel gönderiyi bu kayıt
        // durdurmaz — bilgi amaçlı not olarak MNG'nin ham hatası saklanır.
        cancelNote = `Kargo iptal edildi (MANUEL — MNG API reddetti: ${result.message || 'bilinmeyen hata'}): ${reason}`
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('order_shipments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', shipment.id)
      .select()
      .single()
    if (updateError) throw updateError

    try {
      await supabase.from('shipping_status_history').insert({
        shipment_id: shipment.id,
        status: 'failed',
        location: 'Sistem',
        description: cancelNote,
        timestamp: new Date().toISOString(),
      })
    } catch {
      /* ignore */
    }

    await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', params.orderId)

    return NextResponse.json({ success: true, shipment: updated })
  } catch (error: any) {
    console.error('Cancel shipment error:', error)
    return NextResponse.json({ error: error.message || 'Kargo iptal edilemedi' }, { status: 500 })
  }
}
