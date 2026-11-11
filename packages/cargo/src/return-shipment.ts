import { mngKargo } from './mng'
import { fullAddressLine } from './address-format'

const RETURN_CARRIER = 'mng' as const

/**
 * İade kargosu oluştur: müşteri ürünü mağazaya geri gönderir. MNG'nin GERÇEK
 * iade endpoint'i (Standard Command /createReturnOrder) kullanılır — normal
 * createDetailedOrder ile oluşturulan bir gönderi MNG'nin muhasebesinde
 * "yeni sipariş" gibi görünür, checkReturnOrder ile sorgulanamaz.
 *
 * Best-effort: hata olursa return_shipment_error'a yazılır, talep akışı bozulmaz.
 * `service` service-role Supabase client olmalı (return_requests güncellemesi).
 * Admin ve satıcı panelleri ortak kullanır.
 */
export async function generateReturnShipment(service: any, requestId: string): Promise<void> {
  try {
    const { data: req } = await service
      .from('return_requests')
      .select('id, return_tracking_number, store_id, order_id, quantity, order_items(name)')
      .eq('id', requestId)
      .maybeSingle()

    if (!req || req.return_tracking_number) return // zaten üretilmiş

    const { data: order } = await service
      .from('orders')
      .select('order_number, email, shipping_address')
      .eq('id', req.order_id)
      .maybeSingle()

    const ship = (order?.shipping_address as any) || {}
    const senderAddress = fullAddressLine(ship)

    if (!senderAddress || !ship.city) {
      await service
        .from('return_requests')
        .update({ return_shipment_error: 'Müşterinin teslimat adresi eksik, iade kargosu oluşturulamadı' })
        .eq('id', requestId)
      return
    }

    if (!mngKargo.isConfigured().ok) {
      await service
        .from('return_requests')
        .update({ return_shipment_error: 'MNG API kimlik bilgileri yok' })
        .eq('id', requestId)
      return
    }

    const result = await mngKargo.createReturnOrder({
      // Gönderici = müşteri (ürünü geri gönderen taraf)
      senderName: `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || 'Müşteri',
      senderAddress,
      senderCity: ship.city || '',
      senderDistrict: ship.district || '',
      senderPhone: ship.phone || '',
      weight: 1,
      pieceCount: req.quantity || 1,
      description: `İADE - Sipariş #${order?.order_number || ''} - ${req.order_items?.name || ''}`,
      invoiceNumber: `IADE-${req.id.slice(0, 8)}`,
    })

    if (result.success && result.trackingNumber) {
      let barcode: string | null = null
      const bc = await mngKargo.getBarcode(result.trackingNumber)
      if (bc.success && bc.barcodeBase64) barcode = bc.barcodeBase64

      await service
        .from('return_requests')
        .update({
          return_carrier_code: RETURN_CARRIER,
          return_tracking_number: result.trackingNumber,
          return_tracking_url: `https://www.mngkargo.com.tr/gonderi-takip?code=${result.trackingNumber}`,
          return_label_url: result.labelUrl || null,
          return_barcode_data: barcode,
          return_shipment_created_at: new Date().toISOString(),
          return_shipment_error: null,
        })
        .eq('id', requestId)
    } else {
      await service
        .from('return_requests')
        .update({ return_shipment_error: result.error || 'İade kargosu oluşturulamadı' })
        .eq('id', requestId)
    }
  } catch (e: any) {
    console.error('[return shipment] error', e)
    try {
      await service
        .from('return_requests')
        .update({ return_shipment_error: e?.message || 'Beklenmeyen hata' })
        .eq('id', requestId)
    } catch {
      /* ignore */
    }
  }
}
