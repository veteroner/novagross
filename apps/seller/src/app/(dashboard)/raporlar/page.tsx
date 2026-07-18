import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, PageHeader, EmptyState, Badge, StatCard } from '@novagross/ui'
import { BarChart3, Package, Star, Megaphone, TrendingUp } from 'lucide-react'
import { requireSellerRole } from '@/lib/auth/requireSeller'

export const dynamic = 'force-dynamic'

function formatTry(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

export default async function SellerReportsPage() {
  const { supabase, storeId } = await requireSellerRole('manager', '/raporlar')

  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: productRows } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
  const productIds = (productRows ?? []).map((p: any) => p.id)

  // Top products by revenue / quantity (last 30d)
  const { data: topRows } = await supabase
    .from('order_items')
    .select(
      `product_id, quantity, total,
       product:product_id ( id, name, slug ),
       order:orders!inner(payment_status)`
    )
    .eq('store_id', storeId)
    .eq('order.payment_status', 'paid')
    .gte('created_at', last30)

  const productAggMap = new Map<
    string,
    { product_id: string; name: string; revenue: number; qty: number }
  >()
  for (const row of (topRows ?? []) as any[]) {
    const id = row.product_id
    if (!id) continue
    const e = productAggMap.get(id) ?? {
      product_id: id,
      name: row.product?.name ?? '—',
      revenue: 0,
      qty: 0,
    }
    e.revenue += Number(row.total ?? 0)
    e.qty += Number(row.quantity ?? 0)
    productAggMap.set(id, e)
  }
  const topProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const totalRevenue30 = topProducts.reduce((s, p) => s + p.revenue, 0) // approx — top only
  const totalQty30 = Array.from(productAggMap.values()).reduce((s, p) => s + p.qty, 0)

  // Campaigns + usage
  const { data: campaigns } = await (supabase as any)
    .from('store_campaigns')
    .select('id, name, discount_type, discount_value, buy_quantity, get_quantity, usage_limit, used_count, is_active, starts_at, ends_at, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Reviews summary
  const reviewsRes =
    productIds.length > 0
      ? await supabase
          .from('reviews')
          .select('rating, created_at')
          .in('product_id', productIds)
      : { data: [] as any[] }
  const reviews = (reviewsRes.data ?? []) as any[]
  const reviewCount = reviews.length
  const reviewAvg =
    reviewCount > 0
      ? +(reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewCount).toFixed(1)
      : 0
  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Raporlar" description="Son 30 günün performans raporları" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Adet (30g)"
          value={totalQty30}
          icon={Package}
          iconColor="text-blue-500"
        />
        <StatCard
          label="Top 10 Ciro (30g)"
          value={formatTry(totalRevenue30)}
          icon={TrendingUp}
          iconColor="text-green-500"
        />
        <StatCard
          label="Yorum Puanı"
          value={reviewAvg ? `${reviewAvg} ★` : '—'}
          hint={`${reviewCount} yorum`}
          icon={Star}
          iconColor="text-yellow-500"
        />
        <StatCard
          label="Aktif Kampanya"
          value={(campaigns ?? []).filter((c: any) => c.is_active).length}
          hint={`${(campaigns ?? []).length} toplam`}
          icon={Megaphone}
          iconColor="text-purple-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-green-600" />
            Top 10 Ürün (Ciro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <EmptyState compact icon={Package} title="Son 30 günde satış yok" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Ürün</th>
                    <th className="text-right py-2 px-3 font-medium">Adet</th>
                    <th className="text-right py-2 px-3 font-medium">Ciro</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.product_id} className="border-b">
                      <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/urunler/${p.product_id}/duzenle`}
                          className="text-green-700 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right">{p.qty}</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {formatTry(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-green-600" />
              Kampanya Raporu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(campaigns ?? []).length === 0 ? (
              <EmptyState compact icon={Megaphone} title="Henüz kampanya yok" />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(campaigns ?? []).map((c: any) => {
                  const expired = c.ends_at ? new Date(c.ends_at).getTime() < Date.now() : false
                  const usage =
                    c.usage_limit != null
                      ? `${c.used_count}/${c.usage_limit}`
                      : `${c.used_count} sipariş`
                  return (
                    <div
                      key={c.id}
                      className="border rounded-md p-3 text-sm flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{c.name}</div>
                        <div className="text-xs text-gray-500">
                          {c.discount_type === 'percentage'
                            ? `%${c.discount_value} indirim`
                            : c.discount_type === 'fixed'
                            ? `${Number(c.discount_value).toFixed(2)} ₺ indirim`
                            : `${c.buy_quantity} al ${c.get_quantity} öde`}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={c.is_active && !expired ? 'success' : 'secondary'}
                        >
                          {usage}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Yorum Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewCount === 0 ? (
              <EmptyState compact icon={Star} title="Henüz yorum yok" />
            ) : (
              <div className="space-y-2">
                {ratingBuckets.map((b) => {
                  const w = pctWidth(b.count, reviewCount)
                  return (
                    <div key={b.star} className="flex items-center gap-2 text-sm">
                      <span className="w-10 text-gray-600">{b.star} ★</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-gray-600 text-xs">
                        {b.count}
                      </span>
                    </div>
                  )
                })}
                <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Toplam yorum</span>
                  <span className="font-semibold">{reviewCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Ortalama</span>
                  <span className="font-semibold">{reviewAvg} / 5</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function pctWidth(n: number, total: number) {
  if (!total) return 0
  return Math.round((n / total) * 100)
}
