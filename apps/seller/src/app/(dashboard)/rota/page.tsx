import { Card, PageHeader, EmptyState, Badge } from '@novagross/ui'
import { TrendingUp, ShoppingCart } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { RowActions } from './row-actions'

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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SellerRotaPage() {
  const { supabase, storeId } = await requireSeller('/rota')

  const { data, error } = await (supabase as any)
    .from('seller_cart_suggestions')
    .select('*')
    .eq('store_id', storeId)
    .gt('pending_cart_count', 0)
    .order('pending_cart_count', { ascending: false })
    .limit(200)

  if (error) console.error('[Rota] query failed:', error)
  const items = (data ?? []) as Array<{
    product_id: string
    product_name: string
    product_slug: string
    current_price: number
    compare_at_price: number | null
    stock: number
    pending_cart_count: number
    pending_units: number
    last_added_at: string | null
  }>

  const totalCarts = items.reduce((s, x) => s + Number(x.pending_cart_count || 0), 0)

  // Suggested discount: 10% off current price (rounded to 2 dec)
  const suggest = (price: number) => Math.max(0.01, +(price * 0.9).toFixed(2))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rota — Fiyat Önerileri"
        description="Sepete eklenmiş ama satın alınmamış ürünlere indirim önerin"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Bekleyen ürün</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
            <ShoppingCart className="h-7 w-7 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Bekleyen sepet sayısı</p>
              <p className="text-2xl font-bold">{totalCarts}</p>
            </div>
            <TrendingUp className="h-7 w-7 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-xs text-green-900">
            <strong>Öneri:</strong> Mevcut fiyatın <strong>%10</strong> altına çekerek satışı
            kapatma şansını artırın. Eski fiyat üzeri çizgili olarak gösterilir.
          </p>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Sepette bekleyen ürününüz yok"
            description="Müşteriler bir ürünü sepete attığında ama satın almadığında burada görünür."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Ürün</th>
                  <th className="text-right py-3 px-4 font-medium">Mevcut Fiyat</th>
                  <th className="text-center py-3 px-4 font-medium">Sepetteki Müşteri</th>
                  <th className="text-center py-3 px-4 font-medium">Stok</th>
                  <th className="text-left py-3 px-4 font-medium">Son Eklenme</th>
                  <th className="text-right py-3 px-4 font-medium">Önerilen Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.product_id} className="border-b hover:bg-green-50/30">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{r.product_name}</div>
                      <div className="text-xs text-gray-500">{r.product_slug}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatTry(Number(r.current_price))}
                      {r.compare_at_price && (
                        <div className="text-xs text-gray-400 line-through">
                          {formatTry(Number(r.compare_at_price))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="default" className="bg-orange-500">
                        {r.pending_cart_count} kişi
                      </Badge>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.pending_units} adet
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.stock > 0 ? (
                        <span className="text-gray-700">{r.stock}</span>
                      ) : (
                        <Badge variant="destructive">Stoksuz</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {formatDate(r.last_added_at)}
                    </td>
                    <td className="py-3 px-4">
                      <RowActions
                        productId={r.product_id}
                        currentPrice={Number(r.current_price)}
                        suggestedPrice={suggest(Number(r.current_price))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
