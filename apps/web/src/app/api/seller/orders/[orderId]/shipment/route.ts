import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cargoService, type CargoProvider } from '@/lib/cargo'

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { 
      carrierId, 
      methodId, 
      provider, 
      weight, 
      pieceCount = 1,
      createLabel = true 
    } = body
    
    const { orderId } = params
    
    // Get order details with seller verification
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            store_id,
            stores (
              id,
              owner_id,
              store_name
            )
          )
        )
      `)
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }
    
    // Verify seller owns this order
    const storeOwnerId = order.order_items[0]?.products?.stores?.owner_id
    
    if (storeOwnerId !== user.id) {
      return NextResponse.json(
        { error: 'Bu siparişe erişim yetkiniz yok' },
        { status: 403 }
      )
    }
    
    // Check if already shipped
    const { data: existingShipment } = await supabase
      .from('order_shipments')
      .select('id, tracking_number')
      .eq('order_id', orderId)
      .single()
    
    if (existingShipment?.tracking_number) {
      return NextResponse.json(
        { error: 'Bu sipariş zaten kargoya verilmiş' },
        { status: 400 }
      )
    }
    
    let trackingNumber: string | undefined
    let labelUrl: string | undefined
    let shipmentError: string | undefined
    
    // Create shipment via cargo API if requested
    if (createLabel && provider && order.order_items[0]?.products?.store_id) {
      try {
        // Get store address
        const { data: store } = await supabase
          .from('stores')
          .select('store_name, address, city, district, phone')
          .eq('id', order.order_items[0].products.store_id)
          .single()
        
        // Get shipping address
        const shippingAddress = order.shipping_address as any
        
        if (!store || !shippingAddress) {
          throw new Error('Mağaza veya teslimat adresi bulunamadı')
        }
        
        const shipmentResult = await cargoService.createShipment(
          provider as CargoProvider,
          {
            senderName: store.store_name,
            senderAddress: store.address || '',
            senderCity: store.city || '',
            senderDistrict: store.district || '',
            senderPhone: store.phone || '',
            
            receiverName: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
            receiverAddress: shippingAddress.address_line1,
            receiverCity: shippingAddress.city,
            receiverDistrict: shippingAddress.district || '',
            receiverPhone: shippingAddress.phone,
            receiverEmail: order.email || '',
            
            weight: weight || 1,
            pieceCount,
            paymentType: 'SENDER',
            serviceType: methodId?.includes('express') ? 'EXPRESS' : 'STANDARD',
            
            description: `Novagross Sipariş #${order.order_number}`,
            invoiceNumber: order.order_number,
            invoiceValue: Number(order.subtotal || 0),
          }
        )
        
        if (shipmentResult.success) {
          trackingNumber = shipmentResult.trackingNumber
          labelUrl = shipmentResult.labelUrl
        } else {
          shipmentError = shipmentResult.error
        }
      } catch (error: any) {
        console.error('Cargo API error:', error)
        shipmentError = error.message
      }
    }
    
    // Calculate shipping cost
    let shippingCost = order.shipping_cost || 0
    
    // Try to calculate if we have the function available
    if (order.order_items[0]?.products?.store_id) {
      try {
        const { data } = await supabase.rpc(
          'calculate_shipping_cost' as any,
          {
            p_store_id: order.order_items[0].products.store_id,
            p_method_id: methodId,
            p_order_value: Number(order.subtotal || 0),
            p_weight: weight || 1,
            p_region: 'all',
          }
        )
        if (data) shippingCost = data
      } catch (err) {
        console.log('Shipping cost calculation skipped:', err)
      }
    }
    
    // Create or update shipment record
    const shipmentData = {
      order_id: orderId,
      carrier_id: carrierId,
      method_id: methodId,
      tracking_number: trackingNumber || null,
      tracking_url: trackingNumber 
        ? `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${trackingNumber}`
        : null,
      status: trackingNumber ? 'shipped' : 'preparing',
      package_weight: weight || null,
      shipping_cost: Number(shippingCost),
      shipping_label_url: labelUrl || null,
      shipped_at: trackingNumber ? new Date().toISOString() : null,
    }
    
    let shipment
    
    if (existingShipment) {
      // Update existing
      const { data, error } = await supabase
        .from('order_shipments')
        .update(shipmentData)
        .eq('id', existingShipment.id)
        .select()
        .single()
      
      if (error) throw error
      shipment = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('order_shipments')
        .insert(shipmentData)
        .select()
        .single()
      
      if (error) throw error
      shipment = data
    }
    
    // Update order status
    await supabase
      .from('orders')
      .update({ 
        status: trackingNumber ? 'shipped' : 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
    
    // TODO: Send email to buyer with tracking info
    
    return NextResponse.json({
      success: true,
      shipment,
      cargoApiResult: shipmentError ? { error: shipmentError } : { trackingNumber, labelUrl },
    })
  } catch (error: any) {
    console.error('Create shipment error:', error)
    return NextResponse.json(
      { error: error.message || 'Kargo bilgisi kaydedilemedi' },
      { status: 500 }
    )
  }
}

// GET - Get shipment info for order
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: shipment, error } = await supabase
      .from('order_shipments')
      .select(`
        *,
        carrier:shipping_carriers(*),
        method:shipping_methods(*),
        history:shipping_status_history(*)
      `)
      .eq('order_id', params.orderId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return NextResponse.json({ shipment: shipment || null })
  } catch (error: any) {
    console.error('Get shipment error:', error)
    return NextResponse.json(
      { error: error.message || 'Kargo bilgisi alınamadı' },
      { status: 500 }
    )
  }
}
