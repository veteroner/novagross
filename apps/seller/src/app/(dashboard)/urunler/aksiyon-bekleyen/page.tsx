import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem, Button } from '@novagross/ui'
import { requireSeller } from '@/lib/auth/requireSeller'
import { BadgeCheck, AlertCircle, Edit, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Filter = 'pending' | 'rejected' | 'low_stock' | 'inactive'

function parseFilter(v: string | undefined): Filter {
  return v === 'rejected' || v === 'low_stock' || v === 'inactive' ? v : 'pending'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function PendingActionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase, storeId } = await requireSeller('/urunler/aksiyon-bekleyen')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  const [
    { count: pendingCount },
    { count: rejectedCount },
    { count: lowStockCount },
    { count: inactiveCount },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('approval_status', 'pending'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('approval_status', 'rejected'),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .lte('stock', 5)
      .gt('stock', 0),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('is_active', false),
  ])

  let q = supabase
    .from('products')
    .select(
      'id, name, slug, price, stock, is_active, approval_status, rejection_reason, created_at, updated_at, sku'
    )
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (filter === 'pending') q = q.eq('approval_status', 'pending')
  if (filter === 'rejected') q = q.eq('approval_status', 'rejected')
  if (filter === 'low_stock') q = q.lte('stock', 5).gt('stock', 0)
  if (filter === 'inactive') q = q.eq('is_active', false)

  const { data } = await q
  const items = (data ?? []) as any[]

  const tabs: TabItem[] = [
    {
      key: 'pending',
      label: 'Onay Bekliyor',
      count: pendingCount ?? 0,
      href: '/urunler/aksiyon-bekleyen',
    },
    {
      key: 'rejected',
      label: 'Reddedildi',
      count: rejectedCount ?? 0,
      href: '/urunler/aksiyon-bekleyen?filter=rejected',
    },
    {
      key: 'low_stock',
      label: 'Az Stok',
      count: lowStockCount ?? 0,
      href: '/urunler/aksiyon-bekleyen?filter=low_stock',
    },
    {
      key: 'inactive',
      label: 'Pasif',
      count: inactiveCount ?? 0,
      href: '/urunler/aksiyon-bekleyen?filter=inactive',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aksiyon Bekleyen Ürünler"
        description="Onay bekleyen, reddedilen veya stoğu azalan ürünleriniz"
      />

      <TabBar items={tabs} value={filter} />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={BadgeCheck}
            title={
              filter === 'pending'
                ? 'Onay bekleyen ürün yok'
                : filter === 'rejected'
                ? 'Reddedilen ürün yok — tebrikler!'
                : filter === 'low_stock'
                ? 'Stoğu azalan ürün yok'
                : 'Pasif ürün yok'
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
                  <th className="text-right py-3 px-4 font-medium">Fiyat</th>
                  <th className="text-center py-3 px-4 font-medium">Stok</th>
                  <th className="text-left py-3 px-4 font-medium">Durum / Aksiyon</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b align-top hover:bg-green-50/30">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.slug}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{p.sku ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {Number(p.price).toFixed(2)} ₺
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.stock > 0 ? (
                        p.stock <= 5 ? (
                          <Badge variant="default" className="bg-orange-500">
                            {p.stock} (az)
                          </Badge>
                        ) : (
                          <span className="text-gray-700">{p.stock}</span>
                        )
                      ) : (
                        <Badge variant="destructive">Stoksuz</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {filter === 'pending' && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <span className="text-orange-700">
                            Admin onayı bekleniyor. Genelde 1-2 iş günü sürer.
                          </span>
                        </div>
                      )}
                      {filter === 'rejected' && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-red-700 font-medium">Reddedildi</span>
                            {p.rejection_reason && (
                              <p className="text-gray-700 mt-0.5">{p.rejection_reason}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {filter === 'low_stock' && (
                        <span className="text-xs text-orange-700">
                          Stok azaldı — yeni ürün ekle veya güncelle.
                        </span>
                      )}
                      {filter === 'inactive' && (
                        <span className="text-xs text-gray-600">
                          Pasif durumda — satışa kapalı.
                        </span>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Son güncelleme: {formatDate(p.updated_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/urunler/${p.id}/duzenle`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3 mr-1" />
                          Düzenle
                        </Button>
                      </Link>
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
