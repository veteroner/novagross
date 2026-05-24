import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueEmail } from '../../../../lib/email/queue';
import { requireAdminApi } from '@/lib/auth/requireAdminApi';

export const dynamic = 'force-dynamic';

type RecommendationType = 'similar' | 'frequently-bought' | 'trending' | 'personalized';

/**
 * Product Recommendation Emails
 * Sends personalized product recommendations based on user behavior
 */
export async function POST(req: NextRequest) {
  // Auth: admin only
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const { userId, recommendationType, productId } = await req.json();

    if (!userId || !recommendationType) {
      return NextResponse.json(
        { error: 'userId and recommendationType are required' },
        { status: 400 }
      );
    }

    const validTypes: RecommendationType[] = ['similar', 'frequently-bought', 'trending', 'personalized'];
    if (!validTypes.includes(recommendationType)) {
      return NextResponse.json(
        { error: 'Invalid recommendation type' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let products: any[] = [];
    let baseProductName: string | undefined;

    // Get recommendations based on type
    if (recommendationType === 'similar' && productId) {
      // Get base product
      const { data: baseProduct } = await supabase
        .from('products')
        .select('name, category_id')
        .eq('id', productId)
        .single();

      baseProductName = baseProduct?.name;

      // Get similar products (same category)
      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, average_rating')
        .eq('category_id', baseProduct?.category_id)
        .neq('id', productId)
        .eq('is_active', true)
        .limit(6);

      products = data || [];
    } else if (recommendationType === 'frequently-bought' && productId) {
      // Get products frequently bought together
      // This would require order history analysis
      // For now, get random popular products
      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, average_rating')
        .eq('is_active', true)
        .gte('average_rating', 4.0)
        .limit(6);

      products = data || [];
    } else if (recommendationType === 'trending') {
      // Get trending products (most viewed/sold)
      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, average_rating')
        .eq('is_active', true)
        .order('view_count', { ascending: false })
        .limit(6);

      products = data || [];
    } else {
      // Personalized recommendations based on user's browsing/purchase history
      // For now, get top-rated products
      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, average_rating')
        .eq('is_active', true)
        .gte('average_rating', 4.5)
        .limit(6);

      products = data || [];
    }

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found for recommendations',
      });
    }

    // Format products for email
    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.images?.[0] || '',
      rating: p.average_rating,
      discount: Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : undefined,
    }));

    // Send recommendation email
    await queueEmail({
      to: user.email,
      subject: 'Size Özel Ürün Önerileri ✨',
      template: 'marketing/product-recommendations',
      priority: 'low',
      data: {
        userName: user.full_name || user.email.split('@')[0],
        recommendationType,
        products: formattedProducts,
        baseProductName,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recommendation email sent',
      productCount: formattedProducts.length,
      recommendationType,
    });
  } catch (error: any) {
    console.error('Product recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to send recommendations' },
      { status: 500 }
    );
  }
}
