import { PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { Store } from 'lucide-react'
import { SellersList } from '@/components/admin/SellersList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'active' | 'pending' | 'suspended'

function parseFilter(v: string | undefined): Filter {
  return v === 'active' || v === 'pending' || v === 'suspended' ? v : 'all'
}

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase } = await requireAdmin('/saticilar')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  const [
    { count: totalCount },
    { count: activeCount },
    { count: pendingCount },
    { count: suspendedCount },
  ] = await Promise.all([
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
  ])

  let q = supabase
    .from('stores')
    .select(
      `
      id,
      owner_id,
      store_name,
      store_slug,
      status,
      created_at,
      owner:owner_id (
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (filter !== 'all') q = q.eq('status', filter)

  const { data, error } = await q
  if (error) console.error('Failed to load sellers:', error)
  const sellers = (data ?? []).map((s) => ({ ...s, balance: null }))

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: totalCount ?? 0, href: '/saticilar' },
    { key: 'active', label: 'Aktif', count: activeCount ?? 0, href: '/saticilar?filter=active' },
    {
      key: 'pending',
      label: 'Onay Bekliyor',
      count: pendingCount ?? 0,
      href: '/saticilar?filter=pending',
    },
    {
      key: 'suspended',
      label: 'Askıda',
      count: suspendedCount ?? 0,
      href: '/saticilar?filter=suspended',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Satıcı Yönetimi" description={`${sellers.length} satıcı gösteriliyor`} />

      <TabBar items={tabs} value={filter} />

      {sellers.length === 0 ? (
        <div className="bg-white rounded-lg border">
          <EmptyState
            icon={Store}
            title={filter === 'all' ? 'Henüz satıcı yok' : 'Bu durumda satıcı yok'}
          />
        </div>
      ) : (
        <SellersList initialSellers={sellers as any} />
      )}
    </div>
  )
}
