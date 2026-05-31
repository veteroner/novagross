import Link from 'next/link'
import {
  Card,
  Badge,
  PageHeader,
  EmptyState,
  Button,
  StatCard,
  TabBar,
  type TabItem,
} from '@novagross/ui'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Edit,
  CheckCircle2,
} from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'

export const dynamic = 'force-dynamic'

type Filter = 'critical' | 'low' | 'fast_sellers' | 'all'

function parseFilter(v: string | undefined): Filter {
  return v === 'low' || v === 'fast_sellers' || v === 'all' ? v : 'critical'
}

export default async function StockSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase, storeId } = await requireSeller('/oneriler/stok')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  // 1) Mağazanın tüm ürünleri (sadece aktif onaylı)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, stock, price, sku')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('name')

  const productIds = (products ?? []).map((p: any) => p.id)

  // 2) Bu ürünlerin popular_products kayıtları
  const { data: popularRows } =
    productIds.length > 0
      ? await (supabase as any)
          .from('popular_products')
          .select('product_id, total_sold, order_count, rank')
          .in('product_id', productIds)
      : { data: [] as any[] }

  const popularByProduct = new Map<string, any>()
  for (const r of (popularRows ?? []) as any[]) {
    popularByProduct.set(r.product_id, r)
  }

  // 3) Birleşim: ürünün satış hızı + stok durumu
  type Row = {
    id: string
    name: string
    slug: string
    sku: string | null
    stock: number
    price: number
    total_sold: number
    order_count: number
    rank: number | null
    /** Stok-tükenme tahmini (gün) — son 30 günün ortalama hızına göre */
    days_until_empty: number | null
  }

  const all: Row[] = ((products ?? []) as any[]).map((p) => {
    const pop = popularByProduct.get(p.id)
    const totalSold = Number(pop?.total_sold ?? 0)
    const dailyRate = totalSold / 30 // satış/gün
    const stock = Number(p.stock ?? 0)
    const days_until_empty =
      dailyRate > 0 ? Math.max(0, Math.floor(stock / dailyRate)) : null
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      stock,
      price: Number(p.price ?? 0),
      total_sold: totalSold,
      order_count: Number(pop?.order_count ?? 0),
      rank: pop?.rank ? Number(pop.rank) : null,
      days_until_empty,
    }
  })

  const critical = all
    .filter((r) => r.days_until_empty !== null && r.days_until_empty <= 7)
    .sort((a, b) => (a.days_until_empty ?? 0) - (b.days_until_empty ?? 0))
  const low = all
    .filter(
      (r) =>
        r.days_until_empty !== null &&
        r.days_until_empty > 7 &&
        r.days_until_empty <= 14
    )
    .sort((a, b) => (a.days_until_empty ?? 0) - (b.days_until_empty ?? 0))
  const fastSellers = all
    .filter((r) => r.total_sold > 0 && (!r.rank || r.rank <= 50))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 50)

  const counts = {
    critical: critical.length,
    low: low.length,
    fast_sellers: fastSellers.length,
    all: all.length,
  }

  const items =
    filter === 'critical'
      ? critical
      : filter === 'low'
      ? low
      : filter === 'fast_sellers'
      ? fastSellers
      : all

  // Aggregate stats
  const totalDanger = critical.length
  const totalLowStock = critical.length + low.length
  const totalLostSalesEstimate = critical
    .filter((r) => r.days_until_empty === 0)
    .reduce((s, r) => s + r.price * Math.max(0, r.total_sold / 30 - r.stock), 0)

  const tabs: TabItem[] = [
    {
      key: 'critical',
      label: 'Kritik (7 gün)',
      count: counts.critical,
      href: '/oneriler/stok',
    },
    {
      key: 'low',
      label: 'Az (14 gün)',
      count: counts.low,
      href: '/oneriler/stok?filter=low',
    },
    {
      key: 'fast_sellers',
      label: 'Hızlı Satanlar',
      count: counts.fast_sellers,
      href: '/oneriler/stok?filter=fast_sellers',
    },
    {
      key: 'all',
      label: 'Tüm Ürünler',
      count: counts.all,
      href: '/oneriler/stok?filter=all',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok Önerileri"
        description="Satış hızına göre tükenecek ürünleriniz ve stok ekleme önerileri"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Kritik (7 gün altı)"
          value={totalDanger}
          icon={AlertTriangle}
          iconColor="text-red-500"
          emphasis={totalDanger > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Az stok (14 gün altı)"
          value={totalLowStock}
          icon={Package}
          iconColor="text-orange-500"
        />
        <StatCard
          label="Hızlı satılan ürün"
          value={fastSellers.length}
          icon={TrendingUp}
          iconColor="text-green-500"
        />
      </div>

      <TabBar items={tabs} value={filter} />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={
              filter === 'critical'
                ? 'Kritik stoklu ürün yok'
                : filter === 'low'
                ? 'Az stoklu ürün yok'
                : 'Veri yok'
            }
            description="Tüm ürünleriniz iyi durumda."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Ürün</th>
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-right py-3 px-4 font-medium">Mevcut Stok</th>
                  <th className="text-right py-3 px-4 font-medium">30g Satış</th>
                  <th className="text-right py-3 px-4 font-medium">Tahmini Süre</th>
                  <th className="text-left py-3 px-4 font-medium">Öneri</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const dailyRate = r.total_sold / 30
                  const suggested14 = Math.max(0, Math.ceil(dailyRate * 14) - r.stock)
                  const suggested30 = Math.max(0, Math.ceil(dailyRate * 30) - r.stock)
                  const isCritical =
                    r.days_until_empty !== null && r.days_until_empty <= 7
                  return (
                    <tr key={r.id} className="border-b hover:bg-green-50/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        {r.rank && (
                          <div className="text-xs text-orange-700">
                            Sıralama #{r.rank}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{r.sku ?? '—'}</td>
                      <td className="py-3 px-4 text-right">
                        {r.stock === 0 ? (
                          <Badge variant="destructive">Stoksuz</Badge>
                        ) : isCritical ? (
                          <Badge className="bg-orange-500 text-white">
                            {r.stock}
                          </Badge>
                        ) : (
                          <span>{r.stock}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{r.total_sold}</td>
                      <td className="py-3 px-4 text-right">
                        {r.days_until_empty === null ? (
                          <span className="text-gray-400">—</span>
                        ) : r.days_until_empty === 0 ? (
                          <Badge variant="destructive">Bitti</Badge>
                        ) : r.days_until_empty <= 7 ? (
                          <Badge className="bg-orange-500 text-white">
                            {r.days_until_empty} gün
                          </Badge>
                        ) : (
                          <span>{r.days_until_empty} gün</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {suggested14 > 0 && (
                          <div className="text-gray-700">
                            14 gün için: <strong>+{suggested14}</strong>
                          </div>
                        )}
                        {suggested30 > 0 && (
                          <div className="text-gray-700">
                            30 gün için: <strong>+{suggested30}</strong>
                          </div>
                        )}
                        {suggested14 === 0 && suggested30 === 0 && (
                          <span className="text-green-700">Stok yeterli</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/urunler/${r.id}/duzenle`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Stok güncelle
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
