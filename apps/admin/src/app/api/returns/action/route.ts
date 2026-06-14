import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email/queue'
import { cargoService } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RETURN_CARRIER = 'mng' as const

/**
 * İade kargosu oluştur: müşteri ürünü mağazaya geri gönderir.
 * Gönderici = müşteri (sipariş teslimat adresi), Alıcı = mağaza.
 * Best-effort: hata olursa return_shipment_error'a yazılır, talep akışı bozulmaz.
 */
async function generateReturnShipment(service: any, requestId: string): Promise<void> {
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

    const { data: store } = await service
      .from('stores')
      .select('store_name, address, city, district, phone')
      .eq('id', req.store_id)
      .maybeSingle()

    const ship = (order?.shipping_address as any) || {}

    if (!store?.address || !store?.city) {
      await service
        .from('return_requests')
        .update({ return_shipment_error: 'Mağaza adresi eksik, iade kargosu oluşturulamadı' })
        .eq('id', requestId)
      return
    }

    const mngReady = Boolean(process.env.MNG_CLIENT_ID && process.env.MNG_CLIENT_SECRET)
    if (!mngReady) {
      await service
        .from('return_requests')
        .update({ return_shipment_error: 'MNG API kimlik bilgileri yok' })
        .eq('id', requestId)
      return
    }

    const result = await cargoService.createShipment(RETURN_CARRIER, {
      // Gönderici = müşteri
      senderName: `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || 'Müşteri',
      senderAddress: ship.address_line1 || '',
      senderCity: ship.city || '',
      senderDistrict: ship.district || '',
      senderPhone: ship.phone || '',
      // Alıcı = mağaza
      receiverName: store.store_name,
      receiverAddress: store.address,
      receiverCity: store.city,
      receiverDistrict: store.district || '',
      receiverPhone: store.phone || '',
      receiverEmail: '',

      weight: 1,
      pieceCount: req.quantity || 1,
      paymentType: 'RECEIVER', // iade kargo bedeli mağazaya
      serviceType: 'STANDARD',
      description: `İADE - Sipariş #${order?.order_number || ''} - ${req.order_items?.name || ''}`,
      invoiceNumber: `IADE-${req.id.slice(0, 8)}`,
    })

    if (result.success && result.trackingNumber) {
      let barcode: string | null = null
      const bc = await cargoService.getBarcode(RETURN_CARRIER, result.trackingNumber)
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })
    }

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId, action, adminNote, rejectionReason, iyzicoRefundId } = body

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    let result: any = null

    if (action === 'approve') {
      const { data, error } = await (service as any).rpc('approve_return_request', {
        p_request_id: requestId,
        p_admin_id: user.id,
        p_admin_note: adminNote ?? null,
      })
      if (error) throw new Error(error.message)
      result = data
      // Onaylandı → müşterinin ürünü geri gönderebilmesi için iade kargosu üret (best-effort)
      await generateReturnShipment(service, requestId)
    } else if (action === 'create_return_label') {
      // İade kargosu üretimini manuel tekrar dene
      await generateReturnShipment(service, requestId)
      result = { regenerated: true }
    } else if (action === 'reject') {
      if (!rejectionReason || rejectionReason.length < 5) {
        return NextResponse.json(
          { error: 'Red gerekçesi en az 5 karakter olmalı' },
          { status: 400 }
        )
      }
      const { data, error } = await (service as any).rpc('reject_return_request', {
        p_request_id: requestId,
        p_admin_id: user.id,
        p_rejection_reason: rejectionReason,
      })
      if (error) throw new Error(error.message)
      result = data
    } else if (action === 'mark_refunded') {
      const { data, error } = await (service as any).rpc('mark_return_refunded', {
        p_request_id: requestId,
        p_iyzico_refund_id: iyzicoRefundId ?? null,
      })
      if (error) throw new Error(error.message)
      result = data
    } else {
      return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
    }

    // Email bildirimleri
    try {
      const { data: request } = await (service as any)
        .from('return_requests')
        .select(
          `
          status,
          order_id,
          user_id,
          quantity,
          refund_amount,
          orders ( order_number ),
          order_items ( name )
        `
        )
        .eq('id', requestId)
        .single()

      const { data: customer } = await service
        .from('profiles')
        .select('email, first_name')
        .eq('id', request?.user_id)
        .single()

      if (customer?.email && request) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'
        const templates: Record<string, { subject: string; template: string }> = {
          approve: {
            subject: `Novagross | İadeniz onaylandı - #${request.orders?.order_number ?? ''}`,
            template: 'returns/approved',
          },
          reject: {
            subject: `Novagross | İade talebiniz reddedildi - #${request.orders?.order_number ?? ''}`,
            template: 'returns/rejected',
          },
          mark_refunded: {
            subject: `Novagross | Para iadesi tamamlandı - #${request.orders?.order_number ?? ''}`,
            template: 'returns/refunded',
          },
        }
        const tpl = templates[action]
        if (tpl) {
          await queueEmail({
            to: customer.email,
            subject: tpl.subject,
            template: tpl.template as any,
            priority: 'medium',
            data: {
              orderNumber: request.orders?.order_number,
              customerName: customer.first_name || 'Müşterimiz',
              productName: request.order_items?.name,
              quantity: request.quantity,
              refundAmount: request.refund_amount,
              myReturnsUrl: `${siteUrl}/hesabim/iadelerim`,
              adminNote: action === 'approve' ? adminNote : undefined,
              rejectionReason: action === 'reject' ? rejectionReason : undefined,
            },
          })
        }
      }
    } catch (emailErr) {
      console.warn('Return action email failed:', emailErr)
    }

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('Return action error:', err)
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
