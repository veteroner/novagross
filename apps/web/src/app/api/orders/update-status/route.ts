import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { queueBulkEmails } from '@/lib/email/queue';
import { csrfProtection } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface UpdateOrderStatusRequest {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  carrierName?: string;
  estimatedDelivery?: string;
  cancellationReason?: string;
}

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(req);
  if (csrfError) return csrfError;

  try {
    // Auth: verify caller is admin or seller
    const authSupabase = await createAuthClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: callerProfile } = await authSupabase
      .from('profiles')
      .select('role, is_seller')
      .eq('id', user.id)
      .single();

    const role = callerProfile?.role;
    const isSeller = Boolean(callerProfile?.is_seller);
    if (role !== 'admin' && role !== 'super_admin' && !isSeller) {
      return NextResponse.json({ error: 'Admin or seller access required' }, { status: 403 });
    }

    const {
      orderId,
      status,
      trackingNumber,
      trackingUrl,
      carrierName,
      estimatedDelivery,
      cancellationReason,
    }: UpdateOrderStatusRequest = await req.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get order with all details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            images,
            store:stores (
              id,
              name,
              owner_email
            )
          )
        ),
        profiles!orders_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        tracking_number: trackingNumber,
        carrier_name: carrierName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Queue appropriate emails based on new status
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com';
    const profile = order.profiles as any;
    const buyerName = profile.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Değerli Müşterimiz';

    const emails: any[] = [];

    // Prepare order items for email
    const items = (order.order_items || []).map((item: any) => ({
      name: item.products?.name || 'Ürün',
      quantity: item.quantity,
      price: `₺${item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      productId: item.product_id,
      imageUrl: item.products?.images?.[0],
    }));

    const totalAmount = `₺${order.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

    // Handle status-specific emails
    switch (status) {
      case 'shipped':
        // Email to buyer
        emails.push({
          to: profile.email,
          subject: `Novagross | Siparişiniz Kargoya Verildi - #${order.order_number}`,
          template: 'orders/order-shipped',
          priority: 'high' as const,
          data: {
            orderNumber: order.order_number,
            buyerName,
            trackingNumber: trackingNumber || undefined,
            trackingUrl: trackingUrl || undefined,
            carrierName: carrierName || 'Kargo Firması',
            estimatedDelivery: estimatedDelivery || undefined,
            items: items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              imageUrl: i.imageUrl,
            })),
            shippingAddress: {
              fullName: order.shipping_address?.full_name || buyerName,
              addressLine1: order.shipping_address?.address_line1 || '',
              addressLine2: order.shipping_address?.address_line2,
              city: order.shipping_address?.city || '',
              state: order.shipping_address?.state || '',
              postalCode: order.shipping_address?.postal_code || '',
            },
          },
        });
        break;

      case 'delivered':
        // Email to buyer with review request
        emails.push({
          to: profile.email,
            subject: `Novagross | Siparişiniz Teslim Edildi - #${order.order_number}`,
          template: 'orders/order-delivered',
          priority: 'normal' as const,
          data: {
            orderNumber: order.order_number,
            buyerName,
            deliveredAt: new Date().toLocaleString('tr-TR'),
            items: items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              productId: i.productId,
            })),
            totalAmount,
            reviewUrl: `${siteUrl}/siparis/${order.order_number}/degerlendirme`,
            supportUrl: `${siteUrl}/destek`,
          },
        });
        break;

      case 'cancelled':
        // Email to buyer with refund info
        emails.push({
          to: profile.email,
            subject: `Novagross | Sipariş İptali - #${order.order_number}`,
          template: 'orders/order-cancelled',
          priority: 'high' as const,
          data: {
            orderNumber: order.order_number,
            buyerName,
            cancelledAt: new Date().toLocaleString('tr-TR'),
            cancellationReason: cancellationReason || 'İptal talebi',
            items,
            totalAmount,
            refundAmount: totalAmount,
            refundMethod: order.payment_method === 'credit_card' ? 'Kredi Kartı' : 'Banka Havalesi',
            refundEta: '3-5 iş günü',
            supportUrl: `${siteUrl}/destek`,
          },
        });

        // Notify sellers about cancellation
        const storeGroups = new Map<string, any[]>();
        (order.order_items || []).forEach((item: any) => {
          const storeId = item.products?.store?.id;
          if (!storeId) return;

          if (!storeGroups.has(storeId)) {
            storeGroups.set(storeId, []);
          }
          storeGroups.get(storeId)!.push(item);
        });

        storeGroups.forEach((storeItems, storeId) => {
          const store = storeItems[0]?.products?.store;
          if (!store?.owner_email) return;

          emails.push({
            to: store.owner_email,
              subject: `Novagross | Sipariş İptali - ${store.name} - #${order.order_number}`,
            template: 'orders/order-cancelled',
            priority: 'high' as const,
            data: {
              orderNumber: order.order_number,
              buyerName: store.name,
              cancelledAt: new Date().toLocaleString('tr-TR'),
              cancellationReason: cancellationReason || 'Müşteri talebi',
              items: storeItems.map((item) => ({
                name: item.products?.name || 'Ürün',
                quantity: item.quantity,
                price: `₺${item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
              })),
              totalAmount: `₺${storeItems
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
              refundAmount: '',
              refundMethod: '',
              supportUrl: `${adminUrl}/siparisler/${order.id}`,
            },
          });
        });
        break;

      default:
        // No email for other status changes (pending, processing)
        break;
    }

    // Queue all emails
    if (emails.length > 0) {
      await queueBulkEmails(emails);
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      emailsQueued: emails.length,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
