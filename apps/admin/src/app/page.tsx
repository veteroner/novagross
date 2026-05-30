import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  Bell,
  Store,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Tag,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'

function formatRelativeDate(iso: string | null) {
  if (!iso) return '—'
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

const orderStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}
const orderStatusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  confirmed: 'Onaylandı',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
  refunded: 'İade',
}

export default async function AdminDashboard() {
  const { supabase, userId } = await requireAdmin('/')

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const last7Start = new Date(today)
  last7Start.setDate(last7Start.getDate() - 7)
  const last30Start = new Date(today)
  last30Start.setDate(last30Start.getDate() - 30)
  const prev30Start = new Date(today)
  prev30Start.setDate(prev30Start.getDate() - 60)

  const [
    todayOrders,
    last7Orders,
    last30Orders,
    prev30Orders,
    counts,
    pendingProducts,
    pendingReviews,
    newMessages,
    pendingWithdrawals,
    pendingApps,
    recentOrders,
    me,
  ] = await Promise.all([
    supabase.from('orders').select('total').gte('created_at', today.toISOString()).neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', last7Start.toISOString())
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', last30Start.toISOString())
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', prev30Start.toISOString())
      .lt('created_at', last30Start.toISOString())
      .neq('status', 'cancelled'),
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('stores').select('id', { count: 'exact', head: true }),
    ]),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('store_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id, order_number, user_id, status, total, created_at, shipping_address')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('profiles').select('first_name, last_name, email').eq('id', userId).single(),
  ])

  const sum = (rows: any[] | null | undefined) => (rows ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
  const todaySales = sum(todayOrders.data)
  const last7Sales = sum(last7Orders.data)
  const last30Sales = sum(last30Orders.data)
  const prev30Sales = sum(prev30Orders.data)
  const monthlyChange = percentChange(last30Sales, prev30Sales)

  const [ordersCount, productsCount, customersCount, storesCount] = counts.map((r) => r.count ?? 0)

  const fullName =
    [me.data?.first_name, me.data?.last_name].filter(Boolean).join(' ') || me.data?.email || 'Admin'

  const userIds = Array.from(
    new Set((recentOrders.data ?? []).map((o) => o.user_id).filter((id): id is string => Boolean(id)))
  )
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const recent = (recentOrders.data ?? []).slice(0, 6).map((order) => {
    const profile = order.user_id ? profileById.get(order.user_id) : undefined
    const shipping = order.shipping_address as any
    const customerName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      [shipping?.firstName ?? shipping?.first_name, shipping?.lastName ?? shipping?.last_name]
        .filter(Boolean)
        .join(' ') ||
      'Müşteri'
    return {
      id: order.order_number ?? order.id,
      raw_id: order.id,
      customer: customerName,
      total: order.total ?? 0,
      status: (order.status ?? 'pending') as string,
      date: formatRelativeDate(order.created_at),
    }
  })

  const alerts: Array<{
    href: string
    label: string
    count: number
    icon: typeof CheckCircle2
    color: string
  }> = [
    {
      href: '/urunler/onay-bekleyenler',
      label: 'Onay bekleyen ürün',
      count: pendingProducts.count ?? 0,
      icon: Package,
      color: 'text-orange-600',
    },
    {
      href: '/saticilar/basvurular',
      label: 'Satıcı başvurusu',
      count: pendingApps.count ?? 0,
      icon: Store,
      color: 'text-blue-600',
    },
    {
      href: '/yorumlar?tab=products&status=pending',
      label: 'Onay bekleyen yorum',
      count: pendingReviews.count ?? 0,
      icon: MessageSquare,
      color: 'text-purple-600',
    },
    {
      href: '/iletisim-mesajlari',
      label: 'Yeni mesaj',
      count: newMessages.count ?? 0,
      icon: Bell,
      color: 'text-red-600',
    },
    {
      href: '/para-cekme',
      label: 'Bekleyen para çekme',
      count: pendingWithdrawals.count ?? 0,
      icon: Wallet,
      color: 'text-green-600',
    },
  ]
  const sortedAlerts = alerts.sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Top row: identity + sales + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold shrink-0">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">{BRAND_NAME}</p>
                <p className="text-lg font-semibold truncate">{fullName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success">Aktif</Badge>
                  <span className="text-xs text-gray-500">Admin</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="border rounded-lg p-2">
                <div className="text-xs text-gray-500">Müşteri</div>
                <div className="text-base font-bold">{customersCount}</div>
              </div>
              <div className="border rounded-lg p-2">
                <div className="text-xs text-gray-500">Mağaza</div>
                <div className="text-base font-bold">{storesCount}</div>
              </div>
              <div className="border rounded-lg p-2">
                <div className="text-xs text-gray-500">Ürün</div>
                <div className="text-base font-bold">{productsCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Satış özeti</CardTitle>
              <Link href="/raporlar" className="text-xs text-orange-600 hover:underline">
                Detaylı rapor →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Bugünkü satış</p>
              <p className="text-3xl font-bold mt-1">{formatPrice(todaySales)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{todayOrders.data?.length ?? 0} sipariş</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-500">Son 7 gün</p>
                <p className="text-lg font-semibold">{formatPrice(last7Sales)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Son 30 gün</p>
                <p className="text-lg font-semibold">{formatPrice(last30Sales)}</p>
                {monthlyChange !== null && (
                  <p
                    className={`text-xs flex items-center mt-0.5 ${
                      monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {monthlyChange >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(monthlyChange).toFixed(1)}% önceki 30 güne göre
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts / Performance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                İlgi bekleyenler
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedAlerts.every((a) => a.count === 0) ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-600">Bekleyen iş yok — temiz!</p>
              </div>
            ) : (
              sortedAlerts.slice(0, 5).map((a) => {
                const Icon = a.icon
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md border transition-colors ${
                      a.count > 0 ? 'hover:bg-orange-50 border-orange-200' : 'border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`h-4 w-4 ${a.color}`} />
                      <span className="text-sm text-gray-700 truncate">{a.label}</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${a.count > 0 ? 'text-orange-600' : 'text-gray-400'}`}
                    >
                      {a.count}
                    </span>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Toplam sipariş</p>
                <p className="text-xl font-bold">{ordersCount}</p>
              </div>
              <ShoppingCart className="h-7 w-7 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Ürün</p>
                <p className="text-xl font-bold">{productsCount}</p>
              </div>
              <Package className="h-7 w-7 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Müşteri</p>
                <p className="text-xl font-bold">{customersCount}</p>
              </div>
              <Users className="h-7 w-7 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Mağaza</p>
                <p className="text-xl font-bold">{storesCount}</p>
              </div>
              <Store className="h-7 w-7 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Son siparişler</CardTitle>
              <Link
                href="/siparisler"
                className="text-xs text-orange-600 hover:underline inline-flex items-center"
              >
                Tümü
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Sipariş yok.</div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="text-left py-2 px-6 font-medium">Sipariş</th>
                      <th className="text-left py-2 px-6 font-medium">Müşteri</th>
                      <th className="text-left py-2 px-6 font-medium">Durum</th>
                      <th className="text-right py-2 px-6 font-medium">Tutar</th>
                      <th className="text-right py-2 px-6 font-medium">Zaman</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.raw_id} className="border-b hover:bg-gray-50">
                        <td className="py-2.5 px-6">
                          <Link
                            href={`/siparisler/${o.raw_id}`}
                            className="font-mono text-xs text-orange-600 hover:underline"
                          >
                            {o.id}
                          </Link>
                        </td>
                        <td className="py-2.5 px-6 text-gray-700">{o.customer}</td>
                        <td className="py-2.5 px-6">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              orderStatusColors[o.status] ?? 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {orderStatusLabels[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-6 text-right font-semibold">{formatPrice(o.total)}</td>
                        <td className="py-2.5 px-6 text-right text-xs text-gray-500">{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-orange-500" />
                Hızlı işlemler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/urunler/ekle">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Yeni ürün ekle
                </Button>
              </Link>
              <Link href="/kuponlar">
                <Button variant="outline" className="w-full justify-start">
                  <Tag className="h-4 w-4 mr-2" />
                  Kupon oluştur
                </Button>
              </Link>
              <Link href="/banners">
                <Button variant="outline" className="w-full justify-start">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Banner yönet
                </Button>
              </Link>
              <Link href="/raporlar/anlik-trafik">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Anlık trafik
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
