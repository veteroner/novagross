import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { requireSeller } from '@/lib/auth/requireSeller'
import { AlertCircle, Package, Mail, Phone } from 'lucide-react'
import { ClaimActions } from './claim-actions'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'open' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'

function parseFilter(v: string | undefined): Filter {
  return v === 'open' ||
    v === 'in_progress' ||
    v === 'resolved' ||
    v === 'rejected' ||
    v === 'escalated'
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
  escalated: 'Admin\'e iletildi',
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

export default async function SellerClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase, storeId } = await requireSeller('/talepler')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  // Counts
  const counts: Record<string, number> = {}
  const statuses: Filter[] = ['open', 'in_progress', 'resolved', 'rejected', 'escalated']
  const [allRes, ...statusCounts] = await Promise.all([
    (supabase as any).from('customer_claims').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    ...statuses.map((s) =>
      (supabase as any)
        .from('customer_claims')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', s)
    ),
  ])
  counts.all = allRes.count ?? 0
  statuses.forEach((s, i) => {
    counts[s] = statusCounts[i].count ?? 0
  })

  let q = (supabase as any)
    .from('customer_claims')
    .select(
      `id, claim_type, reason, description, attachments, status, resolution, refund_amount,
       seller_responded_at, resolved_at, escalated_to_admin, created_at,
       order_id, order_item_id,
       customer:customer_id ( first_name, last_name, email, phone ),
       order:order_id ( order_number ),
       order_item:order_item_id (
         id, quantity, price,
         product:product_id ( id, name )
       )`
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filter !== 'all') q = q.eq('status', filter)
  const { data } = await q
  const claims = (data ?? []) as any[]

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: counts.all, href: '/talepler' },
    { key: 'open', label: 'Açık', count: counts.open ?? 0, href: '/talepler?filter=open' },
    {
      key: 'in_progress',
      label: 'İşlemde',
      count: counts.in_progress ?? 0,
      href: '/talepler?filter=in_progress',
    },
    {
      key: 'resolved',
      label: 'Çözüldü',
      count: counts.resolved ?? 0,
      href: '/talepler?filter=resolved',
    },
    {
      key: 'rejected',
      label: 'Reddedildi',
      count: counts.rejected ?? 0,
      href: '/talepler?filter=rejected',
    },
    {
      key: 'escalated',
      label: 'Admin\'de',
      count: counts.escalated ?? 0,
      href: '/talepler?filter=escalated',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Talepleri"
        description="Siparişlerinize gelen iade, değişim ve şikayet taleplerini yönetin"
      />

      <TabBar items={tabs} value={filter} />

      {claims.length === 0 ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title={filter === 'all' ? 'Henüz talep yok' : 'Bu durumda talep yok'}
            description="Müşterileriniz iade/değişim talebi açtığında burada görünecek."
          />
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
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        className={`text-white ${STATUS_BADGE[c.status] ?? 'bg-gray-500'}`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                      <Badge variant="outline">{CLAIM_TYPE_LABEL[c.claim_type] ?? c.claim_type}</Badge>
                      <span className="text-xs text-gray-500">
                        {formatDate(c.created_at)}
                      </span>
                      {c.escalated_to_admin && (
                        <Badge variant="outline" className="text-purple-700">
                          Admin görüyor
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-1 text-sm">
                      {c.order?.order_number && (
                        <Link
                          href={`/siparisler?o=${c.order.order_number}`}
                          className="text-green-700 hover:underline font-mono"
                        >
                          #{c.order.order_number}
                        </Link>
                      )}
                      {c.order_item?.product?.name && (
                        <>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-700">
                            <Package className="h-3 w-3 inline mr-1" />
                            {c.order_item.product.name}
                          </span>
                        </>
                      )}
                      {c.order_item?.quantity && (
                        <span className="text-xs text-gray-500">
                          ({c.order_item.quantity} adet ×{' '}
                          {Number(c.order_item.price).toFixed(2)} ₺)
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-900 font-medium mb-0.5">
                      {customerName}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      {customer?.email && (
                        <a
                          href={`mailto:${customer.email}`}
                          className="flex items-center gap-1 hover:text-green-700"
                        >
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </a>
                      )}
                      {customer?.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-1 hover:text-green-700"
                        >
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </a>
                      )}
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
                      <div className="font-medium text-gray-800 mb-1">{c.reason}</div>
                      {c.description && (
                        <p className="text-gray-700 whitespace-pre-wrap">{c.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <ClaimActions
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
