import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '../../../../lib/email/queue';
import { requireAdminApi } from '@/lib/auth/requireAdminApi';

export const dynamic = 'force-dynamic';

/**
 * Abandoned Cart Recovery
 * Detects carts abandoned for 24+ hours and sends recovery emails
 */
export async function POST(req: NextRequest) {
  // Auth: admin only
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find abandoned carts (24+ hours old, not checked out)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: abandonedCarts, error: fetchError } = await supabase
      .from('carts')
      .select(`
        *,
        user:profiles(id, email, first_name, last_name),
        items:cart_items(
          quantity,
          product:products(id, name, price, images)
        )
      `)
      .eq('status', 'active')
      .lt('updated_at', oneDayAgo.toISOString())
      .is('checked_out_at', null);

    if (fetchError) {
      console.error('Failed to fetch abandoned carts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch abandoned carts' },
        { status: 500 }
      );
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No abandoned carts found',
        count: 0,
      });
    }

    const emailsSent = [];

    // Send recovery email for each abandoned cart
    for (const cart of abandonedCarts) {
      if (!cart.user?.email || !cart.items || cart.items.length === 0) {
        continue;
      }

      const cartItems = cart.items.map((item: any) => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.images?.[0] || '',
      }));

      const totalAmount = cartItems.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );

      // Generate discount code (10% off, valid 24 hours)
      const discountCode = `RECOVER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const discountAmount = totalAmount * 0.1;

      // Queue recovery email
      await queueEmail({
        to: cart.user.email,
        subject: 'Sepetinizdeki Ürünler Sizi Bekliyor! 🛒',
        template: 'marketing/abandoned-cart',
        priority: 'medium',
        data: {
          userName: cart.user.full_name || cart.user.email.split('@')[0],
          cartItems,
          totalAmount,
          checkoutUrl: `${process.env.NEXT_PUBLIC_WEB_URL}/sepet`,
          discountCode,
          discountAmount,
        },
      });

      emailsSent.push({
        userId: cart.user.id,
        email: cart.user.email,
        itemCount: cart.items.length,
        totalAmount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery emails sent',
      count: emailsSent.length,
      details: emailsSent,
    });
  } catch (error: any) {
    console.error('Abandoned cart recovery error:', error);
    return NextResponse.json(
      { error: 'Failed to process abandoned carts' },
      { status: 500 }
    );
  }
}
