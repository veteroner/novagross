import Link from 'next/link'
import { Card, Badge, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { RotateCcw, Package, Truck } from 'lucide-react'
import { ReturnActions } from './return-actions'

type ReturnFilter = 'pending' | 'approved' | 'rejected' | 'refunded' | 'all'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  refunded: 'Para iadesi yapıldı',
  cancelled: 'Müşteri iptal etti',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-orange-500',
  approved: 'bg-blue-600',
  rejected: 'bg-red-600',
  refunded: 'bg-green-600',
  cancelled: 'bg-gray-500',
}

const REASON_CATEGORY_LABEL: Record<string, string> = {
  defective: 'Ürün arızalı / bozuk',
  wrong_item: 'Yanlış ürün gönderildi',
  not_as_described: 'Açıklamaya uygun değil',
  damaged_in_shipping: 'Kargoda hasar gördü',
  changed_mind: 'Fikrim değişti',
  late_delivery: 'Geç teslim edildi',
  other: 'Diğer',
}

function parseReturnFilter(v: string | undefined): ReturnFilter {
  return v === 'approved' || v === 'rejected' || v === 'refunded' || v === 'all' ? v : 'pending'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function ReturnsSection({
  supabase,
  storeId,
  canDecide,
  status,
}: {
  supabase: any
  storeId: string
  canDecide: boolean
  status: string | undefined
}) {
  const filter = parseReturnFilter(status)
  const statuses: Exclude<ReturnFilter, 'all'>[] = ['pending', 'approved', 'rejected', 'refunded']

  const [allRes, ...statusCounts] = await Promise.all([
    supabase.from('return_requests').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    ...statuses.map((s) =>
      supabase
        .from('return_requests')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', s)
    ),
  ])
  const countError = [allRes, ...statusCounts].find((result) => result.error)?.error
  if (countError) {
    console.error('[seller returns] count query failed', countError)
    throw new Error('İade talepleri yüklenemedi. Lütfen tekrar deneyin.')
  }
  const counts: Record<string, number> = { all: allRes.count ?? 0 }
  statuses.forEach((s, i) => {
    counts[s] = statusCounts[i].count ?? 0
  })

  let q = supabase
    .from('return_requests')
    .select(
      `id, status, reason, reason_category, customer_note, quantity, refund_amount,
       created_at, reviewed_at, rejection_reason, admin_note,
       return_tracking_number, return_tracking_url, return_shipment_error,
       order:order_id ( order_number, shipping_address ),
       order_item:order_item_id ( name, price, quantity )`
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filter !== 'all') q = q.eq('status', filter)
  const { data, error } = await q
  if (error) {
    console.error('[seller returns] list query failed', error)
    throw new Error('İade talepleri yüklenemedi. Lütfen tekrar deneyin.')
  }
  const rows = (data ?? []) as any[]

  const base = '/talepler?tab=iadeler'
  const tabs: TabItem[] = [
    { key: 'pending', label: 'Onay Bekleyen', count: counts.pending ?? 0, href: base },
    { key: 'approved', label: 'Onaylanan', count: counts.approved ?? 0, href: `${base}&status=approved` },
    { key: 'refunded', label: 'Para İadesi Yapılan', count: counts.refunded ?? 0, href: `${base}&status=refunded` },
    { key: 'rejected', label: 'Reddedilen', count: counts.rejected ?? 0, href: `${base}&status=rejected` },
    { key: 'all', label: 'Tümü', count: counts.all, href: `${base}&status=all` },
  ]

  return (
    <div className="space-y-4">
      <TabBar items={tabs} value={filter} />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={RotateCcw}
            title={filter === 'pending' ? 'Onay bekleyen iade yok' : 'Bu durumda iade yok'}
            description="Müşterileriniz iade talebi oluşturduğunda burada görünecek."
          />
        </Card>
      ) : (
        rows.map((r) => {
          const ship = r.order?.shipping_address || {}
          const customerName = [ship.first_name, ship.last_name].filter(Boolean).join(' ') || 'Müşteri'
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={`text-white ${STATUS_BADGE[r.status] ?? 'bg-gray-500'}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
                <Badge variant="outline">İade</Badge>
                <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 mb-1 text-sm flex-wrap">
                {r.order?.order_number && (
                  <Link
                    href={`/siparisler?o=${r.order.order_number}`}
                    className="text-green-700 hover:underline font-mono"
                  >
                    #{r.order.order_number}
                  </Link>
                )}
                {r.order_item?.name && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-700">
                      <Package className="h-3 w-3 inline mr-1" />
                      {r.order_item.name}
                    </span>
                  </>
                )}
                <span className="text-xs text-gray-500">
                  ({r.quantity} adet · iade tutarı {Number(r.refund_amount ?? 0).toFixed(2)} ₺)
                </span>
              </div>

              <div className="text-sm text-gray-900 font-medium mb-2">{customerName}</div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
                <div className="font-medium text-gray-800 mb-1">
                  {REASON_CATEGORY_LABEL[r.reason_category] ?? 'İade nedeni'}
                </div>
                {r.reason && <p className="text-gray-700 whitespace-pre-wrap">{r.reason}</p>}
                {r.customer_note && (
                  <p className="text-gray-600 whitespace-pre-wrap mt-1">Not: {r.customer_note}</p>
                )}
              </div>

              {r.status === 'rejected' && r.rejection_reason && (
                <p className="mt-2 text-sm text-red-700">Red gerekçesi: {r.rejection_reason}</p>
              )}
              {(r.status === 'approved' || r.status === 'refunded') && (
                <div className="mt-2 text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                  <Truck className="h-4 w-4 text-blue-600" />
                  {r.return_tracking_number ? (
                    <>
                      İade kargo kodu:{' '}
                      <a
                        href={r.return_tracking_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-blue-700 hover:underline"
                      >
                        {r.return_tracking_number}
                      </a>
                    </>
                  ) : (
                    <span className="text-amber-700">
                      İade kargo kodu henüz oluşmadı
                      {r.return_shipment_error ? ` (${r.return_shipment_error})` : ''} — Novagross destek
                      ekibi takip ediyor.
                    </span>
                  )}
                </div>
              )}

              {r.status === 'pending' && <ReturnActions requestId={r.id} canDecide={canDecide} />}
            </Card>
          )
        })
      )}
    </div>
  )
}
