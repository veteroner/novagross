import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { trackingNumber: rawTracking } = await request.json()

    const trackingNumber = typeof rawTracking === 'string' ? rawTracking.trim() : ''

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Takip numarası gereklidir' },
        { status: 400 }
      )
    }

    // SECURITY: PostgREST .or() string interpolation injection vektörü.
    // Tracking numarası sadece alfanumerik + tire olabilir; aksi halde reddet.
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(trackingNumber)) {
      return NextResponse.json(
        { error: 'Geçersiz takip numarası formatı' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Search in orders by order number or shipping tracking number
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        tracking_number,
        shipping_method,
        created_at,
        updated_at
      `)
      .or(`order_number.eq.${trackingNumber},tracking_number.eq.${trackingNumber}`)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı. Lütfen takip numaranızı kontrol edin.' },
        { status: 404 }
      )
    }

    // Map order status to Turkish
    const statusMap: Record<string, string> = {
      pending: 'Onay Bekliyor',
      confirmed: 'Onaylandı',
      processing: 'Hazırlanıyor',
      shipped: 'Kargoya Verildi',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi',
      refunded: 'İade Edildi',
    }

    const carrierMap: Record<string, string> = {
      aras: 'Aras Kargo',
      yurtici: 'Yurtiçi Kargo',
      mng: 'MNG Kargo',
      ptt: 'PTT Kargo',
      ups: 'UPS',
      dhl: 'DHL',
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        status: order.status ? (statusMap[order.status] || order.status) : 'Durum Bilinmiyor',
        statusCode: order.status || 'unknown',
        trackingNumber: order.tracking_number,
        carrier: order.shipping_method || null,
        carrierCode: order.shipping_method,
        orderDate: order.created_at,
        lastUpdate: order.updated_at,
        // Note: shippingAddress and totalAmount intentionally omitted for unauthenticated callers
      },
    })
  } catch (error) {
    console.error('Cargo tracking error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
