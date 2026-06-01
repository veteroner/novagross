import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { Megaphone } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ModerationActions } from './moderation-actions'

export const dynamic = 'force-dynamic'

const AD_TYPE_LABEL: Record<string, string> = {
  sponsored_product: 'Sponsorlu Ürün',
  sponsored_brand: 'Sponsorlu Marka',
  sponsored_category: 'Sponsorlu Kategori',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  paused: 'Duraklatıldı',
  expired: 'Süresi Doldu',
}
const STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  approved: 'success',
  rejected: 'destructive',
  paused: 'secondary',
  expired: 'secondary',
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'paused'

function parseFilter(v: string | undefined): Filter {
  return v === 'pending' || v === 'approved' || v === 'rejected' || v === 'paused' ? v : 'all'
}

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  let q = (supabase as any)
    .from('ad_campaigns')
    .select(
      'id, name, ad_type, status, daily_budget, bid_per_click, total_spent, is_active, rejection_reason, starts_at, ends_at, created_at, store_id, stores!ad_campaigns_store_id_fkey(name, store_slug)'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter !== 'all') q = q.eq('status', filter)
  const { data } = await q
  const campaigns = (data ?? []) as any[]

  // Sayım için ayrı sorgu
  const { data: allForCount } = await (supabase as any)
    .from('ad_campaigns')
    .select('status')
  const buckets = (allForCount ?? []).reduce(
    (acc: any, c: any) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', href: '/reklamlar', count: allForCount?.length },
    {
      key: 'pending',
      label: 'Onay Bekleyen',
      href: '/reklamlar?filter=pending',
      count: buckets.pending,
    },
    {
      key: 'approved',
      label: 'Onaylı',
      href: '/reklamlar?filter=approved',
      count: buckets.approved,
    },
    {
      key: 'paused',
      label: 'Duraklatıldı',
      href: '/reklamlar?filter=paused',
      count: buckets.paused,
    },
    {
      key: 'rejected',
      label: 'Reddedildi',
      href: '/reklamlar?filter=rejected',
      count: buckets.rejected,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklam Moderasyonu"
        description="Satıcıların oluşturduğu reklam kampanyalarını onaylayın veya reddedin."
      />

      <TabBar items={tabs} value={filter} />

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Reklam kampanyası yok"
            description="Bu filtre için kampanya bulunamadı."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Kampanya</th>
                  <th className="text-left py-3 px-4 font-medium">Mağaza</th>
                  <th className="text-left py-3 px-4 font-medium">Tip</th>
                  <th className="text-left py-3 px-4 font-medium">Bütçe</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-orange-50/30">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleString('tr-TR')}
                      </div>
                      {c.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Red: {c.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {c.stores?.name ?? '—'}
                      {c.stores?.store_slug && (
                        <div className="text-xs text-gray-500">
                          /{c.stores.store_slug}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {AD_TYPE_LABEL[c.ad_type] ?? c.ad_type}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>₺{Number(c.daily_budget).toFixed(2)}/gün</div>
                      <div className="text-xs text-gray-500">
                        tıklama: ₺{Number(c.bid_per_click).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[c.status] ?? 'default'}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ModerationActions id={c.id} status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
