import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Haftalık satıcı içgörü raporu: her aktif mağazaya son 7 günün
// görüntülenme / sepet / satış / kaçan satış özeti + öneriler e-postası.
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
  const summary = { stores: 0, sent: 0, skipped: 0 }

  try {
    const { data: stores, error } = await db
      .from('stores')
      .select('id, store_name, email, owner_id')
      .eq('status', 'active')
      .limit(200)
    if (error) throw new Error(error.message)
    summary.stores = (stores || []).length

    const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'
    const weekLabel = `${new Date(Date.now() - 7 * 86400_000).toLocaleDateString('tr-TR')} – ${new Date().toLocaleDateString('tr-TR')}`

    for (const store of stores || []) {
      const { data: interest } = await db.rpc('get_product_interest', {
        p_store_id: store.id,
        p_days: 7,
      })
      const rows: any[] = interest || []

      const totals = rows.reduce(
        (acc, r) => ({
          views: acc.views + Number(r.views || 0),
          cartAdds: acc.cartAdds + Number(r.cart_adds || 0),
          purchases: acc.purchases + Number(r.purchases || 0),
          abandoned: acc.abandoned + Number(r.abandoned_users || 0),
        }),
        { views: 0, cartAdds: 0, purchases: 0, abandoned: 0 }
      )

      // Hiç aktivite yoksa e-posta atma
      if (totals.views === 0 && totals.cartAdds === 0 && totals.purchases === 0) {
        summary.skipped++
        continue
      }

      // Satıcı e-postası
      let email: string | null = store.email
      if (!email && store.owner_id) {
        const { data: owner } = await db
          .from('profiles')
          .select('email')
          .eq('id', store.owner_id)
          .maybeSingle()
        email = owner?.email || null
      }
      if (!email) {
        summary.skipped++
        continue
      }

      const active = rows.filter((r) => r.views > 0 || r.cart_adds > 0)
      const topProducts = active.slice(0, 5).map((r) => ({
        name: r.name,
        views: Number(r.views || 0),
        cartAdds: Number(r.cart_adds || 0),
        abandonedUsers: Number(r.abandoned_users || 0),
        purchases: Number(r.purchases || 0),
      }))

      // Otomatik öneriler
      const suggestions: string[] = []
      const worstAbandon = active
        .filter((r) => Number(r.abandoned_users) > 0)
        .sort((a, b) => Number(b.abandoned_users) - Number(a.abandoned_users))[0]
      if (worstAbandon) {
        suggestions.push(
          `"${worstAbandon.name}" ürününü ${worstAbandon.abandoned_users} kişi sepete ekleyip almadı — Kaçan Satışlar sayfasından onlara özel indirim gönderin.`
        )
      }
      const viewedNoSale = active.find((r) => Number(r.views) >= 20 && Number(r.purchases) === 0)
      if (viewedNoSale) {
        suggestions.push(
          `"${viewedNoSale.name}" çok görüntülendi ama hiç satılmadı — fiyat, fotoğraf ve açıklamayı gözden geçirin.`
        )
      }
      if (totals.cartAdds > 0 && totals.purchases === 0) {
        suggestions.push(
          'Sepete eklemeler var ama satış yok — kargo süresi ve ürün açıklamalarını netleştirmek dönüşümü artırır.'
        )
      }

      await db.from('email_queue').insert({
        recipient: email,
        template: 'seller/weekly-insights',
        subject: `${store.store_name} — Haftalık Mağaza Raporu 📊`,
        data: {
          storeName: store.store_name,
          weekLabel,
          totalViews: totals.views,
          totalCartAdds: totals.cartAdds,
          totalPurchases: totals.purchases,
          totalAbandoned: totals.abandoned,
          topProducts,
          suggestions,
          panelUrl: `${sellerUrl}/kacan-satislar`,
        },
        priority: 'low',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
      })
      summary.sent++
    }

    return NextResponse.json({ ok: true, summary })
  } catch (error: any) {
    console.error('[weekly-seller-insights] error:', error)
    return NextResponse.json({ ok: false, error: error?.message, summary }, { status: 500 })
  }
}
