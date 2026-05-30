import { PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { Wallet } from 'lucide-react'
import WithdrawalList from '@/components/admin/WithdrawalList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed'

function parseFilter(v: string | undefined): Filter {
  return v === 'pending' || v === 'approved' || v === 'rejected' || v === 'completed' ? v : 'all'
}

export default async function WithdrawalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { userId, supabase } = await requireAdmin('/para-cekme')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { count: completedCount },
  ] = await Promise.all([
    supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }),
    supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected'),
    supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ])

  let q = supabase
    .from('withdrawal_requests')
    .select(
      `
      id,
      store_id,
      amount,
      fee,
      net_amount,
      status,
      bank_name,
      iban,
      account_holder,
      rejection_reason,
      admin_notes,
      transaction_id,
      requested_at,
      processed_at,
      created_at,
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      )
    `
    )
    .order('requested_at', { ascending: false })
    .limit(500)

  if (filter !== 'all') q = q.eq('status', filter)

  const { data, error } = await q
  if (error) console.error('Failed to load withdrawal requests:', error)

  const withdrawalRequests = (data ?? []).map((r: any) => {
    const fee = r.fee ?? 0
    const netAmount = r.net_amount ?? (r.amount ?? 0) - fee
    const requestedAt = r.requested_at ?? r.created_at ?? new Date().toISOString()
    const createdAt = r.created_at ?? requestedAt
    return {
      ...r,
      fee,
      net_amount: netAmount,
      requested_at: requestedAt,
      created_at: createdAt,
    }
  })

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: totalCount ?? 0, href: '/para-cekme' },
    {
      key: 'pending',
      label: 'Bekleyen',
      count: pendingCount ?? 0,
      href: '/para-cekme?filter=pending',
    },
    {
      key: 'approved',
      label: 'Onaylı',
      count: approvedCount ?? 0,
      href: '/para-cekme?filter=approved',
    },
    {
      key: 'completed',
      label: 'Tamamlandı',
      count: completedCount ?? 0,
      href: '/para-cekme?filter=completed',
    },
    {
      key: 'rejected',
      label: 'Reddedildi',
      count: rejectedCount ?? 0,
      href: '/para-cekme?filter=rejected',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Para Çekme Talepleri"
        description={`${withdrawalRequests.length} talep gösteriliyor`}
      />

      <TabBar items={tabs} value={filter} />

      {withdrawalRequests.length === 0 ? (
        <div className="bg-white rounded-lg border">
          <EmptyState
            icon={Wallet}
            title={filter === 'all' ? 'Henüz para çekme talebi yok' : 'Bu durumda talep yok'}
          />
        </div>
      ) : (
        <WithdrawalList requests={withdrawalRequests as any} adminId={userId} />
      )}
    </div>
  )
}
