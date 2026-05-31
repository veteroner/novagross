import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { AlertCircle, Package, Mail, Store } from 'lucide-react'
import { AdminClaimActions } from './claim-actions'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'escalated' | 'open' | 'in_progress' | 'resolved' | 'rejected'

function parseFilter(v: string | undefined): Filter {
  return v === 'escalated' || v === 'open' || v === 'in_progress' || v === 'resolved' || v === 'rejected'
    ? v
    : 'all'
}

const CLAIM_TYPE_LABEL: Record<string, string> = {
  return: 'İade',
  exchange: 'Değişim',
  complaint: 'Şikayet',
  damage: 'Hasar',
  missing: 'Eksik Ürün',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Açık',
  in_progress: 'İşlemde',
  resolved: 'Çözüldü',
  rejected: 'Reddedildi',
  escalated: 'Escalated',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-orange-500',
  in_progress: 'bg-blue-500',
  resolved: 'bg-green-600',
  rejected: 'bg-red-600',
  escalated: 'bg-purple-600',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase } = await requireAdmin('/talepler')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  const statuses: Array<'open' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'> = [
    'open',
    'in_progress',
    'resolved',
    'rejected',
    'escalated',
  ]
  const [allRes, ...stCounts] = await Promise.all([
    (supabase as any).from('customer_claims').select('id', { count: 'exact', head: true }),
    ...statuses.map((s) =>
      (supabase as any)
        .from('customer_claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', s)
    ),
  ])
  const counts: Record<string, number> = { all: allRes.count ?? 0 }
  statuses.forEach((s, i) => {
    counts[s] = stCounts[i].count ?? 0
  })

  let q = (supabase as any)
    .from('customer_claims')
    .select(
      `id, claim_type, reason, description, status, resolution, refund_amount,
       seller_responded_at, resolved_at, escalated_to_admin, created_at,
       order:order_id ( order_number ),
       customer:customer_id ( first_name, last_name, email ),
       store:store_id ( id, store_name )`
    )
    .order('escalated_to_admin', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)
  if (filter !== 'all') q = q.eq('status', filter)
  const { data } = await q
  const claims = (data ?? []) as any[]

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: counts.all, href: '/talepler' },
    { key: 'escalated', label: 'Escalated', count: counts.escalated ?? 0, href: '/talepler?filter=escalated' },
    { key: 'open', label: 'Açık', count: counts.open ?? 0, href: '/talepler?filter=open' },
    { key: 'in_progress', label: 'İşlemde', count: counts.in_progress ?? 0, href: '/talepler?filter=in_progress' },
    { key: 'resolved', label: 'Çözüldü', count: counts.resolved ?? 0, href: '/talepler?filter=resolved' },
    { key: 'rejected', label: 'Reddedildi', count: counts.rejected ?? 0, href: '/talepler?filter=rejected' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Talepleri"
        description="Tüm mağazalardan gelen iade/değişim/şikayet talepleri. Escalated olanları öncelikle yönetin."
      />

      <TabBar items={tabs} value={filter} />

      {claims.length === 0 ? (
        <Card>
          <EmptyState icon={AlertCircle} title="Talep yok" />
        </Card>
      ) : (
        <div className="space-y-4">
          {claims.map((c) => {
            const customer = c.customer
            const customerName =
              [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
              customer?.email ||
              'Müşteri'
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={`text-white ${STATUS_BADGE[c.status] ?? 'bg-gray-500'}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Badge>
                  <Badge variant="outline">{CLAIM_TYPE_LABEL[c.claim_type] ?? c.claim_type}</Badge>
                  {c.escalated_to_admin && (
                    <Badge className="bg-purple-600">Satıcı escalated etti</Badge>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(c.created_at)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm mb-1">
                  {c.order?.order_number && (
                    <Link
                      href={`/siparisler?o=${c.order.order_number}`}
                      className="text-orange-700 hover:underline font-mono"
                    >
                      #{c.order.order_number}
                    </Link>
                  )}
                  {c.store?.store_name && (
                    <Link
                      href={`/saticilar`}
                      className="flex items-center gap-1 text-gray-700 hover:text-orange-700"
                    >
                      <Store className="h-3 w-3" />
                      {c.store.store_name}
                    </Link>
                  )}
                  <span className="flex items-center gap-1 text-gray-700">
                    <Package className="h-3 w-3" />
                    {customerName}
                  </span>
                  {customer?.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-700"
                    >
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </a>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm mt-2">
                  <div className="font-medium text-gray-800 mb-1">{c.reason}</div>
                  {c.description && (
                    <p className="text-gray-700 whitespace-pre-wrap">{c.description}</p>
                  )}
                </div>

                <AdminClaimActions
                  claimId={c.id}
                  currentStatus={c.status}
                  initialResolution={c.resolution}
                  initialRefund={c.refund_amount != null ? Number(c.refund_amount) : null}
                />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
