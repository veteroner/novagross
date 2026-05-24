import { Card, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { Package, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type StockAdjustment = {
  id: string
  product_id: string
  variant_id: string | null
  adjustment_type: string
  quantity_change: number
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  performed_by: string | null
  created_at: string | null
  product?: {
    name: string
    sku: string
  }
}

function formatDate(isoDate: string | null) {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const adjustmentTypeLabels: Record<string, string> = {
  'manual_increase': 'Manuel Artış',
  'manual_decrease': 'Manuel Azalış',
  'sale': 'Satış',
  'return': 'İade',
  'damage': 'Hasar',
  'correction': 'Düzeltme',
  'restock': 'Yeniden Stok',
}

const adjustmentTypeColors: Record<string, any> = {
  'manual_increase': 'success',
  'manual_decrease': 'destructive',
  'sale': 'secondary',
  'return': 'success',
  'damage': 'destructive',
  'correction': 'default',
  'restock': 'success',
}

export default async function StokGecmisiPage() {
  await requireAdmin('/urunler/stok-gecmisi')

  const supabase = await createClient()

  // Fetch stock adjustments with product info
  const { data: adjustments, error } = await supabase
    // Some tables may not be present in generated Supabase types.
    // We intentionally bypass types here for admin reporting pages.
    .from('stock_adjustments' as any)
    .select(`
      *,
      product:products(name, sku)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching stock adjustments:', error)
  }

  const rows = (adjustments as unknown as StockAdjustment[]) || []

  // Calculate stats
  const totalIncreases = rows.reduce((sum, adj) => 
    adj.quantity_change > 0 ? sum + adj.quantity_change : sum, 0) || 0
  const totalDecreases = rows.reduce((sum, adj) => 
    adj.quantity_change < 0 ? sum + Math.abs(adj.quantity_change) : sum, 0) || 0
  const totalAdjustments = rows.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Stok Geçmişi</h1>
        <p className="text-gray-600 mt-1">Tüm stok hareketlerini ve değişikliklerini görüntüleyin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam İşlem</p>
              <p className="text-2xl font-bold">{totalAdjustments}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Artış</p>
              <p className="text-2xl font-bold text-green-600">+{totalIncreases}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Azalış</p>
              <p className="text-2xl font-bold text-red-600">-{totalDecreases}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Stock Adjustments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ürün</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">İşlem Tipi</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Miktar</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sebep</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Referans</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((adj) => (
                  <tr key={adj.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{adj.product?.name || 'N/A'}</p>
                        {adj.product?.sku && (
                          <p className="text-xs text-gray-500">SKU: {adj.product.sku}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={adjustmentTypeColors[adj.adjustment_type] || 'default'}>
                        {adjustmentTypeLabels[adj.adjustment_type] || adj.adjustment_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${
                        adj.quantity_change > 0 ? 'text-green-600' : 
                        adj.quantity_change < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">{adj.reason || '-'}</p>
                    </td>
                    <td className="py-3 px-4">
                      {adj.reference_type && adj.reference_id ? (
                        <div className="text-sm">
                          <p className="text-gray-600">{adj.reference_type}</p>
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {adj.reference_id.substring(0, 8)}...
                          </code>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(adj.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Henüz stok hareketi bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
