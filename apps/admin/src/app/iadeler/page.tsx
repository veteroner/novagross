import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type ReturnRequest = {
  id: string
  order_id: string
  order_item_id: string
  user_id: string
  store_id: string
  quantity: number
  reason: string
  reason_category: string
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
  refund_amount: number
  created_at: string
  reviewed_at: string | null
  refunded_at: string | null
  orders: { order_number: string | null }
  order_items: { name: string | null; price: number }
  stores: { store_name: string | null }
  profiles?: { email: string | null; first_name: string | null }
}

const STATUS_MAP: Record<ReturnRequest['status'], { label: string; cls: string }> = {
  pending: { label: 'İncelemede', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Onaylandı', cls: 'bg-blue-100 text-blue-800' },
  refunded: { label: 'İade tamamlandı', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-800' },
  cancelled: { label: 'İptal', cls: 'bg-gray-100 text-gray-800' },
}

function formatTry(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  await requireAdmin('/iadeler')
  const supabase = createServiceRoleClient()

  let query = (supabase as any)
    .from('return_requests')
    .select(`
      id,
      order_id,
      order_item_id,
      user_id,
      store_id,
      quantity,
      reason,
      reason_category,
      status,
      refund_amount,
      created_at,
      reviewed_at,
      refunded_at,
      orders ( order_number ),
      order_items ( name, price ),
      stores ( store_name )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('Returns query failed:', error)
  }

  const list = (rows as ReturnRequest[] | null) || []

  const counts = {
    pending: list.filter((r) => r.status === 'pending').length,
    approved: list.filter((r) => r.status === 'approved').length,
    refunded: list.filter((r) => r.status === 'refunded').length,
    rejected: list.filter((r) => r.status === 'rejected').length,
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">İade Talepleri</h1>
        <p className="text-gray-600 mt-1">14 günlük yasal iade süresi içinde gelen talepler</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'approved', 'refunded', 'rejected'].map((s) => {
          const active = (searchParams.status || 'all') === s
          const label =
            s === 'all'
              ? `Tümü (${list.length})`
              : `${STATUS_MAP[s as ReturnRequest['status']]?.label ?? s} (${
                  counts[s as keyof typeof counts] ?? 0
                })`
          return (
            <Link
              key={s}
              href={`/iadeler?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Talepler</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Bu filtrede iade talebi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Tarih</th>
                    <th className="text-left py-2 px-3">Sipariş</th>
                    <th className="text-left py-2 px-3">Mağaza</th>
                    <th className="text-left py-2 px-3">Ürün</th>
                    <th className="text-left py-2 px-3">Adet</th>
                    <th className="text-left py-2 px-3">Tutar</th>
                    <th className="text-left py-2 px-3">Durum</th>
                    <th className="text-right py-2 px-3">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const status = STATUS_MAP[r.status]
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs">{formatDate(r.created_at)}</td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {r.orders?.order_number ?? r.order_id.slice(0, 8)}
                        </td>
                        <td className="py-2 px-3">{r.stores?.store_name ?? '—'}</td>
                        <td className="py-2 px-3 max-w-xs truncate">{r.order_items?.name ?? '—'}</td>
                        <td className="py-2 px-3">{r.quantity}</td>
                        <td className="py-2 px-3">{formatTry(Number(r.refund_amount) || 0)}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            href={`/iadeler/${r.id}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Detay →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-300">
          <CardContent className="text-red-700 py-4">Veri yüklenemedi: {error.message}</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
