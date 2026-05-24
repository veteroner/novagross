import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook endpoint for cargo companies to send tracking updates
 * Each cargo company should be configured to send updates to:
 * - Yurtiçi: /api/webhooks/cargo/yurtici
 * - Aras: /api/webhooks/cargo/aras
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate webhook secret (REQUIRED)
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.CARGO_WEBHOOK_SECRET
    
    if (!expectedSecret) {
      console.error('CARGO_WEBHOOK_SECRET is not configured – rejecting webhook')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      )
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }
    
    const {
      trackingNumber,
      status,
      statusDescription,
      location,
      timestamp,
      estimatedDelivery,
    } = body
    
    if (!trackingNumber || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Find shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('order_shipments')
      .select('id, order_id, status')
      .eq('tracking_number', trackingNumber)
      .single()
    
    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      )
    }
    
    // Map cargo status to our status
    const mappedStatus = mapCargoStatus(status)
    
    // Update shipment status
    const updateData: any = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    }
    
    if (estimatedDelivery) {
      updateData.estimated_delivery_at = estimatedDelivery
    }
    
    if (mappedStatus === 'delivered') {
      updateData.delivered_at = timestamp || new Date().toISOString()
      
      // Also update order status
      await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipment.order_id)
    }
    
    await supabase
      .from('order_shipments')
      .update(updateData)
      .eq('id', shipment.id)
    
    // Insert status history
    await supabase
      .from('shipping_status_history')
      .insert({
        shipment_id: shipment.id,
        status: mappedStatus,
        location,
        description: statusDescription,
        timestamp: timestamp || new Date().toISOString(),
        raw_data: body,
      })
    
    // TODO: Send email notification to customer on status change
    // Especially for: shipped, out_for_delivery, delivered
    
    console.log(`✅ Cargo webhook processed: ${trackingNumber} -> ${mappedStatus}`)
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    })
  } catch (error: any) {
    console.error('Cargo webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Map various cargo company statuses to our unified status
 */
function mapCargoStatus(cargoStatus: string): string {
  const status = cargoStatus.toLowerCase()
  
  // Delivered
  if (status.includes('teslim') || status.includes('delivered')) {
    return 'delivered'
  }
  
  // Out for delivery
  if (
    status.includes('dağıtım') ||
    status.includes('kurye') ||
    status.includes('delivery')
  ) {
    return 'out_for_delivery'
  }
  
  // In transit
  if (
    status.includes('transfer') ||
    status.includes('aktarma') ||
    status.includes('merkez') ||
    status.includes('transit')
  ) {
    return 'in_transit'
  }
  
  // Shipped
  if (
    status.includes('kargo') ||
    status.includes('shipped') ||
    status.includes('çıkış')
  ) {
    return 'shipped'
  }
  
  // Failed
  if (
    status.includes('başarısız') ||
    status.includes('failed') ||
    status.includes('iptal')
  ) {
    return 'failed'
  }
  
  // Returned
  if (status.includes('iade') || status.includes('return')) {
    return 'returned'
  }
  
  // Default to in_transit
  return 'in_transit'
}
