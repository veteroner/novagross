import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargoService, isKolayGelsinEnabledForStore, type CargoProvider } from '@novagross/cargo'
import { assertSellerOwnsOrder } from '@/lib/order-ownership'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { fullAddressLine } from '@novagross/cargo/address'

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

const REAL_PROVIDERS: CargoProvider[] = ['mng', 'aras', 'yurtici', 'kolaygelsin']

function buildTrackingUrl(template: string | null | undefined, trackingNumber: string) {
  if (!template) return null
  return template.replace('{tracking_number}', encodeURIComponent(trackingNumber))
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
      .select('id, order_number, subtotal, shipping_cost, status, payment_status, email, shipping_address')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    const { data: existingShipment, error: shipmentError } = await (supabase as any)
      .from('order_shipments')
      .select('id, tracking_number, status, provider_code')
      .eq('order_id', orderId)
      .maybeSingle()

    if (shipmentError) throw shipmentError

    // Kargo firması kodu — gerçek API çağrısı için gerekli
    const { data: carrier } = await supabase
      .from('shipping_carriers')
      .select('code, tracking_url_template, is_active, api_enabled')
      .eq('id', carrierId)
      .maybeSingle()

    const carrierCode = (carrier?.code || '').toLowerCase() as CargoProvider

    const isKolayGelsin = carrierCode === 'kolaygelsin'
    const replacingCancelledKolayGelsin = existingShipment?.provider_code === 'kolaygelsin' &&
      existingShipment.status === 'failed' && !isKolayGelsin
    if (existingShipment?.tracking_number && !replacingCancelledKolayGelsin) {
      return NextResponse.json({ error: 'Bu siparişin mevcut bir kargo kaydı var' }, { status: 400 })
    }
    if (isKolayGelsin) {
      if (!carrier?.is_active || !carrier.api_enabled || !isKolayGelsinEnabledForStore(ownership.storeId)) {
        return NextResponse.json({ error: 'Bu mağazada Kolay Gelsin bağlantısı etkin değil' }, { status: 403 })
      }
      if (order.status !== 'processing' || order.payment_status !== 'paid' || !createLabel || manualTrackingNumber) {
        return NextResponse.json({ error: 'Kolay Gelsin iş emri yalnızca ödenmiş, hazırlanan siparişler için oluşturulabilir' }, { status: 422 })
      }

      const [{ data: method, error: methodError }, { data: otherItems, error: itemsError }] = await Promise.all([
        supabase.from('shipping_methods').select('id').eq('id', methodId).eq('carrier_id', carrierId).eq('is_active', true).maybeSingle(),
        createServiceRoleClient().from('order_items').select('id').eq('order_id', orderId)
          .or(`store_id.neq.${ownership.storeId},store_id.is.null`).limit(1),
      ])
      if (methodError || itemsError) throw methodError || itemsError
      if (!method || otherItems?.length) {
        return NextResponse.json({ error: 'Tek mağazaya ait bir sipariş ve etkin Kolay Gelsin yöntemi gerekli' }, { status: 422 })
      }
    }

    let carrierTrackingUrl: string | undefined
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

        if (!isKolayGelsin && (!store?.address || !store?.city)) {
          return NextResponse.json(
            { error: 'Mağaza adresi eksik. Ayarlar > Mağaza Bilgileri’nden adres girin.' },
            { status: 422 }
          )
        }
        if (!fullAddressLine(ship) || !ship.city) {
          return NextResponse.json({ error: 'Sipariş teslimat adresi eksik.' }, { status: 422 })
        }

        const result = await cargoService.createShipment(carrierCode, {
          senderName: store?.store_name || '',
          senderAddress: store?.address || '',
          senderCity: store?.city || '',
          senderDistrict: store?.district || '',
          senderPhone: store?.phone || '',

          receiverName: `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || 'Müşteri',
          receiverAddress: fullAddressLine(ship),
          receiverCity: ship.city,
          receiverDistrict: ship.district || '',
          receiverPhone: ship.phone || '',
          receiverEmail: order.email || ship.email || '',

          weight: Number(weight || 1),
          pieceCount: Number(pieceCount || 1),
          paymentType: 'SENDER',
          serviceType: 'STANDARD',

          description: `Novagross Sipariş #${order.order_number}`,
          referenceNumber: isKolayGelsin ? `NG-${order.id}` : undefined,
          invoiceNumber: order.order_number,
          invoiceValue: Number(order.subtotal || 0),
        }, isKolayGelsin ? async () => {
          const { error } = await (createServiceRoleClient() as any).from('kolay_gelsin_dispatches').insert({ order_id: orderId })
          if (error?.code === '23505') return false
          if (error) throw new Error('Kolay Gelsin iş emri için kayıt açılamadı.')
          return true
        } : undefined)

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
        carrierTrackingUrl = result.trackingUrl
        if (isKolayGelsin) {
          officialBarcode = result.officialBarcode || null
          labelZpl = result.zpl || null
        } else {
          const bc = await cargoService.getBarcode(carrierCode, result.trackingNumber)
          if (bc.success) {
            barcodeData = bc.barcodeBase64 || null
            officialBarcode = bc.officialBarcode || null
            labelZpl = bc.zpl || null
          }
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
      ? carrierTrackingUrl || buildTrackingUrl(carrier?.tracking_url_template, trackingNumber)
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

    const shipped = Boolean(trackingNumber) && !isKolayGelsin
    const status: ShipmentStatus = shipped ? 'shipped' : 'preparing'

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
      shipped_at: shipped ? new Date().toISOString() : null,
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
        status: shipped ? 'shipped' : 'processing',
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      shipment,
      cargoApiResult: { trackingNumber, labelUrl, barcode: Boolean(barcodeData || labelZpl), providerCode },
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

    if (body.action === 'refresh_kolay_gelsin') {
      if (!isKolayGelsinEnabledForStore(ownership.storeId)) {
        return NextResponse.json({ error: 'Bu mağazada Kolay Gelsin bağlantısı etkin değil' }, { status: 403 })
      }
      const { data: shipment, error } = await (supabase as any).from('order_shipments')
        .select('id, status, tracking_number, shipped_at, delivered_at')
        .eq('order_id', params.orderId).eq('provider_code', 'kolaygelsin').maybeSingle()
      if (error || !shipment?.tracking_number) {
        return NextResponse.json({ error: 'Kolay Gelsin iş emri bulunamadı' }, { status: 404 })
      }
      const tracking = await cargoService.trackShipment('kolaygelsin', shipment.tracking_number, `NG-${params.orderId}`)
      if (!tracking.success) return NextResponse.json({ error: tracking.statusDescription }, { status: 502 })

      const statusMap: Record<string, ShipmentStatus> = {
        in_transit: 'in_transit', out_for_delivery: 'out_for_delivery', delivered: 'delivered',
        cancelled: 'failed', returned: 'returned',
      }
      const status = statusMap[tracking.status]
      if (!status || (['delivered', 'failed', 'returned'].includes(shipment.status) && status !== shipment.status)) {
        return NextResponse.json({ success: true, description: tracking.statusDescription })
      }

      const now = new Date().toISOString()
      const inDelivery = ['in_transit', 'out_for_delivery', 'delivered'].includes(status)
      if (status !== shipment.status) {
        const { data: updated, error: updateError } = await supabase.from('order_shipments').update({
          status, updated_at: now,
          shipped_at: inDelivery ? shipment.shipped_at || now : shipment.shipped_at,
          delivered_at: status === 'delivered' ? shipment.delivered_at || now : shipment.delivered_at,
        }).eq('id', shipment.id).eq('status', shipment.status).select('id').maybeSingle()
        if (updateError) throw updateError
        if (!updated) return NextResponse.json({ success: true, description: tracking.statusDescription })
      }
      if (inDelivery) {
        const { error: orderError } = await supabase.from('orders')
          .update({ status: status === 'delivered' ? 'delivered' : 'shipped', updated_at: now })
          .eq('id', params.orderId).in('status', status === 'delivered' ? ['processing', 'shipped'] : ['processing'])
        if (orderError) throw orderError
      }
      return NextResponse.json({ success: true, description: tracking.statusDescription })
    }

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
      const isKolayGelsin = shipment.provider_code === 'kolaygelsin'
      if (isKolayGelsin && !isKolayGelsinEnabledForStore(ownership.storeId)) {
        return NextResponse.json({ error: 'Bu mağazada Kolay Gelsin bağlantısı etkin değil' }, { status: 403 })
      }
      const bc = await cargoService.getBarcode(shipment.provider_code as CargoProvider, shipment.tracking_number,
        isKolayGelsin ? `NG-${params.orderId}` : undefined)
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
    const isKolayGelsin = provider === 'kolaygelsin'
    if (isKolayGelsin && !isKolayGelsinEnabledForStore(ownership.storeId)) {
      return NextResponse.json({ error: 'Bu mağazada Kolay Gelsin bağlantısı etkin değil' }, { status: 403 })
    }
    if (REAL_PROVIDERS.includes(provider)) {
      const result = await cargoService.cancelShipment(provider, shipment.tracking_number, reason,
        isKolayGelsin ? `NG-${params.orderId}` : undefined)
      if (!result.success) {
        if (!force || isKolayGelsin) {
          // MNG API'si reddetti (örn. hesap yetki hatası) — satıcıya elle
          // iptal seçeneği sunulsun diye ham hatayı geri döndür, kaydı
          // henüz değiştirme.
          return NextResponse.json(
            { error: result.message || 'Kargo iptal edilemedi', canForce: !isKolayGelsin },
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

    if (isKolayGelsin) {
      const { error: orderError } = await supabase.from('orders')
        .update({ tracking_number: null, updated_at: new Date().toISOString() })
        .eq('id', params.orderId).eq('tracking_number', shipment.tracking_number)
      if (orderError) throw orderError
      return NextResponse.json({ success: true, shipment: updated, shipmentOnly: true })
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
