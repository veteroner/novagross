import { Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'

type Stat = {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: typeof TrendingUp
}

function formatRelativeDate(iso: string | null) {
  if (!iso) return 'Tarih yok'
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / (60 * 1000))
  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk önce`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} saat önce`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function formatChange(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) return { change: '—', trend: 'up' as const }
  const trend = pct >= 0 ? ('up' as const) : ('down' as const)
  const abs = Math.abs(pct)
  return { change: `${pct >= 0 ? '+' : '-'}${abs.toFixed(1)}%`, trend }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

export default async function AdminDashboard() {
  // Enforce authentication + admin role for the dashboard.
  let supabase
  try {
    const result = await requireAdmin('/')
    supabase = result.supabase
  } catch (error) {
    console.error('[Admin Dashboard] requireAdmin failed:', error)
    throw new Error('Admin authentication failed. Please ensure migrations are applied.')
  }

  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - 30)
  const previousStart = new Date(now)
  previousStart.setDate(previousStart.getDate() - 60)

  const [{ data: currentOrders, error: currentOrdersError }, { data: previousOrders, error: previousOrdersError }] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', currentStart.toISOString())
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString())
      .neq('status', 'cancelled'),
  ])

  if (currentOrdersError || previousOrdersError) {
    console.error('[Admin Dashboard] Orders query failed:', { currentOrdersError, previousOrdersError })
    throw new Error('Failed to load orders. This may indicate RLS policy issues.')
  }

  const currentSales = (currentOrders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
  const previousSales = (previousOrders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
  const salesPct = percentChange(currentSales, previousSales)

  const [
    { count: ordersCount, error: ordersCountError },
    { count: productsCount, error: productsCountError },
    { count: customersCount, error: customersCountError }
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  if (ordersCountError || productsCountError || customersCountError) {
    console.error('[Admin Dashboard] Count queries failed:', {
      ordersCountError,
      productsCountError,
      customersCountError
    })
    throw new Error('Failed to load statistics. Please apply all database migrations.')
  }

  const stats: Stat[] = [
    {
      title: 'Toplam Satış (30g)',
      value: formatPrice(currentSales),
      ...formatChange(salesPct),
      icon: TrendingUp,
    },
    {
      title: 'Siparişler',
      value: String(ordersCount ?? 0),
      change: '—',
      trend: 'up',
      icon: ShoppingCart,
    },
    {
      title: 'Ürünler',
      value: String(productsCount ?? 0),
      change: '—',
      trend: 'up',
      icon: Package,
    },
    {
      title: 'Müşteriler',
      value: String(customersCount ?? 0),
      change: '—',
      trend: 'up',
      icon: Users,
    },
  ]

  const { data: recentOrdersRaw } = await supabase
    .from('orders')
    .select('id, order_number, user_id, status, total, created_at, shipping_address')
    .order('created_at', { ascending: false })
    .limit(10)

  const userIds = Array.from(
    new Set((recentOrdersRaw ?? []).map((o) => o.user_id).filter((id): id is string => Boolean(id)))
  )
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const recentOrders = (recentOrdersRaw ?? []).slice(0, 5).map((order) => {
    const profile = order.user_id ? profileById.get(order.user_id) : undefined
    const shipping = order.shipping_address as any
    const shipFirst = shipping?.firstName ?? shipping?.first_name
    const shipLast = shipping?.lastName ?? shipping?.last_name
    const customerName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      [shipFirst, shipLast].filter(Boolean).join(' ') ||
      'Müşteri'

    return {
      id: order.order_number ?? order.id,
      customer: customerName,
      total: order.total ?? 0,
      status: (order.status ?? 'pending') as string,
      date: formatRelativeDate(order.created_at),
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Genel bakış" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            label={stat.title}
            value={stat.value}
            hint={
              <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 inline-block mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 inline-block mr-1" />
                )}
                {stat.change} bu ay
              </span>
            }
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Son Siparişler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Sipariş No</th>
                  <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                  <th className="text-left py-3 px-4 font-medium">Tutar</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-left py-3 px-4 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{order.id}</td>
                    <td className="py-3 px-4">{order.customer}</td>
                    <td className="py-3 px-4">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[order.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
