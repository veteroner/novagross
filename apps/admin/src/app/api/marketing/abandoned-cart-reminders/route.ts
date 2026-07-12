import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Terk edilmiş sepet hatırlatması: 24 saat - 7 gün arası bekleyen sepet
// kalemleri olan üyelere e-posta + site içi bildirim. 7 günde en fazla 1 kez.
// Cron ile çağrılır (MARKETING_CRON_SECRET).

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.MARKETING_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient() as any
  const summary = { candidates: 0, reminded: 0, skipped: 0 }

  try {
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString()
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()

    // 24 saat - 7 gün arası bekleyen sepet kalemleri (üyeli sepetler)
    const { data: items, error } = await db
      .from('cart_items')
      .select(`
        quantity, created_at,
        cart:carts!inner(user_id),
        product:products(id, name, price, slug)
      `)
      .lt('created_at', dayAgo)
      .gte('created_at', weekAgo)
      .not('cart.user_id', 'is', null)
      .limit(500)
    if (error) throw new Error(error.message)

    // Kullanıcı bazında grupla
    const byUser = new Map<string, any[]>()
    for (const it of items || []) {
      const uid = it.cart?.user_id
      if (!uid || !it.product) continue
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push(it)
    }
    summary.candidates = byUser.size

    const siteUrl = process.env.NEXT_PUBLIC_WEB_SITE_URL || 'https://novagross.com'

    for (const [uid, userItems] of byUser) {
      // Son 7 günde hatırlatma gönderildiyse atla (bildirim tablosu işaret görevi görür)
      const { data: recent } = await db
        .from('user_notifications')
        .select('id')
        .eq('user_id', uid)
        .eq('type', 'cart_reminder')
        .gte('created_at', weekAgo)
        .limit(1)
        .maybeSingle()
      if (recent) {
        summary.skipped++
        continue
      }

      const { data: profile } = await db
        .from('profiles')
        .select('email, first_name')
        .eq('id', uid)
        .maybeSingle()
      if (!profile?.email) {
        summary.skipped++
        continue
      }

      const cartItems = userItems.slice(0, 5).map((it: any) => ({
        name: it.product.name,
        price: Number(it.product.price) || 0,
        quantity: it.quantity,
        imageUrl: '',
      }))
      const totalAmount = userItems.reduce(
        (s: number, it: any) => s + (Number(it.product.price) || 0) * it.quantity,
        0
      )

      await db.from('email_queue').insert({
        recipient: profile.email,
        template: 'marketing/abandoned-cart',
        subject: 'Sepetinizdeki ürünler sizi bekliyor 🛒',
        data: {
          userName: profile.first_name || 'Değerli Müşterimiz',
          cartItems,
          totalAmount,
          checkoutUrl: `${siteUrl}/sepet`,
        },
        priority: 'low',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
      })

      await db.from('user_notifications').insert({
        user_id: uid,
        type: 'cart_reminder',
        title: 'Sepetinizde ürünler bekliyor 🛒',
        body: `${userItems.length} ürün sepetinizde — tükenmeden tamamlayın.`,
        link: '/sepet',
      })

      summary.reminded++
    }

    return NextResponse.json({ ok: true, summary })
  } catch (error: any) {
    console.error('[abandoned-cart-reminders] error:', error)
    return NextResponse.json({ ok: false, error: error?.message, summary }, { status: 500 })
  }
}
