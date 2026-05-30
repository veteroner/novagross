import Link from 'next/link'
import { Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { Mail, Phone, ShoppingBag, ChevronRight, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'with_orders' | 'no_orders' | 'new' | 'sellers'

function parseFilter(v: string | undefined): Filter {
  return v === 'with_orders' || v === 'no_orders' || v === 'new' || v === 'sellers' ? v : 'all'
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase } = await requireAdmin('/musteriler')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  // Counts for tabs (parallel)
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { count: totalCount },
    { count: newCount },
    { count: sellersCount },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', last30),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_seller', true),
  ])

  // List (with orders relation for filtering by has-orders)
  let q = supabase
    .from('profiles')
    .select(
      `id, email, first_name, last_name, phone, created_at, is_seller, orders:orders(count)`
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter === 'sellers') q = q.eq('is_seller', true)
  else q = q.eq('role', 'user')
  if (filter === 'new') q = q.gte('created_at', last30)

  const { data, error } = await q
  if (error) console.error('[Müşteriler] query failed:', error)

  let customers = data ?? []
  if (filter === 'with_orders') {
    customers = customers.filter((c: any) => ((c.orders?.[0]?.count ?? 0) > 0))
  } else if (filter === 'no_orders') {
    customers = customers.filter((c: any) => ((c.orders?.[0]?.count ?? 0) === 0))
  }

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: totalCount ?? 0, href: '/musteriler' },
    {
      key: 'with_orders',
      label: 'Sipariş Veren',
      href: '/musteriler?filter=with_orders',
    },
    {
      key: 'no_orders',
      label: 'Sipariş Vermeyen',
      href: '/musteriler?filter=no_orders',
    },
    { key: 'new', label: 'Yeni (30 gün)', count: newCount ?? 0, href: '/musteriler?filter=new' },
    { key: 'sellers', label: 'Satıcı', count: sellersCount ?? 0, href: '/musteriler?filter=sellers' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Müşteriler" description={`${customers.length} kayıt gösteriliyor`} />

      <TabBar items={tabs} value={filter} />

      <div className="bg-white rounded-lg border overflow-hidden">
        {customers.length === 0 ? (
          <EmptyState icon={Users} title="Müşteri yok" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-600">
                  <th className="text-left py-3 px-5 font-medium">Ad Soyad</th>
                  <th className="text-left py-3 px-5 font-medium">İletişim</th>
                  <th className="text-left py-3 px-5 font-medium">Sipariş</th>
                  <th className="text-left py-3 px-5 font-medium">Üyelik</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="border-b hover:bg-orange-50/30 cursor-pointer group"
                  >
                    <td className="py-3 px-5">
                      <Link href={`/musteriler/${customer.id}`} className="block">
                        <p className="font-medium text-gray-900 group-hover:text-orange-600">
                          {[customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
                            'İsimsiz'}
                        </p>
                        {customer.is_seller && (
                          <Badge variant="outline" className="text-xs mt-0.5">
                            Satıcı
                          </Badge>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <Link href={`/musteriler/${customer.id}`} className="block">
                        <div className="flex flex-col gap-1 text-xs text-gray-600">
                          {customer.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <Link href={`/musteriler/${customer.id}`} className="block">
                        <Badge variant="secondary">
                          <ShoppingBag className="h-3 w-3 mr-1" />
                          {(customer.orders as any)?.[0]?.count || 0}
                        </Badge>
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-xs text-gray-600">
                      <Link href={`/musteriler/${customer.id}`} className="block">
                        {customer.created_at
                          ? new Date(customer.created_at).toLocaleDateString('tr-TR')
                          : '-'}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-400 group-hover:text-orange-600">
                      <Link href={`/musteriler/${customer.id}`} className="block">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
