import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem, StatCard } from '@novagross/ui'
import { Users, MousePointerClick, ShoppingBag, Wallet } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ModerationActions } from './moderation-actions'
import { SaleActions } from './sale-actions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  suspended: 'Askıda',
}
const STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  approved: 'success',
  rejected: 'destructive',
  suspended: 'secondary',
}

const SALE_STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylı',
  paid: 'Ödendi',
  cancelled: 'İptal',
}
const SALE_STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  confirmed: 'success',
  paid: 'success',
  cancelled: 'destructive',
}

type Tab = 'all' | 'pending' | 'approved' | 'sales' | 'rejected'

function parseTab(v: string | undefined): Tab {
  return v === 'pending' || v === 'approved' || v === 'sales' || v === 'rejected' ? v : 'all'
}

export default async function AdminInfluencersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const tab = parseTab(sp.tab)

  // Counters
  const { data: allForCount } = await (supabase as any)
    .from('influencers')
    .select('status')
  const buckets = (allForCount ?? []).reduce(
    (acc: any, c: any) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const { count: pendingSalesCount } = await (supabase as any)
    .from('affiliate_sales')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', href: '/influencerlar', count: allForCount?.length },
    {
      key: 'pending',
      label: 'Onay Bekleyen',
      href: '/influencerlar?tab=pending',
      count: buckets.pending,
    },
    {
      key: 'approved',
      label: 'Onaylı',
      href: '/influencerlar?tab=approved',
      count: buckets.approved,
    },
    {
      key: 'sales',
      label: 'Komisyon Ödemeleri',
      href: '/influencerlar?tab=sales',
      count: pendingSalesCount ?? 0,
    },
    {
      key: 'rejected',
      label: 'Reddedilen',
      href: '/influencerlar?tab=rejected',
      count: buckets.rejected,
    },
  ]

  // Sales tab vs influencer list
  if (tab === 'sales') {
    const { data: sales } = await (supabase as any)
      .from('affiliate_sales')
      .select(
        'id, order_id, order_total, commission_percent, commission_amount, status, paid_at, created_at, influencers(id, name, ref_code, payout_iban), orders(order_number)'
      )
      .order('created_at', { ascending: false })
      .limit(200)
    const rows = (sales ?? []) as any[]

    const totalPending = rows
      .filter((r) => r.status === 'pending')
      .reduce((a, r) => a + Number(r.commission_amount), 0)
    const totalConfirmed = rows
      .filter((r) => r.status === 'confirmed')
      .reduce((a, r) => a + Number(r.commission_amount), 0)

    return (
      <div className="space-y-6">
        <PageHeader
          title="Influencer Komisyonları"
          description="Affiliate satışlardan kazanılan komisyonları onaylayın ve ödeyin."
        />
        <TabBar items={tabs} value={tab} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Wallet} label="Bekleyen Komisyon" value={`₺${totalPending.toFixed(2)}`} />
          <StatCard icon={Wallet} label="Ödenecek (Onaylı)" value={`₺${totalConfirmed.toFixed(2)}`} />
          <StatCard icon={ShoppingBag} label="Toplam Satış" value={String(rows.length)} />
        </div>

        <Card>
          {rows.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Affiliate satış yok"
              description="Henüz hiç influencer linkinden satış gerçekleşmedi."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Influencer</th>
                    <th className="text-left py-3 px-4 font-medium">Sipariş</th>
                    <th className="text-left py-3 px-4 font-medium">Tutar</th>
                    <th className="text-left py-3 px-4 font-medium">Komisyon</th>
                    <th className="text-left py-3 px-4 font-medium">Durum</th>
                    <th className="text-left py-3 px-4 font-medium">Tarih</th>
                    <th className="text-right py-3 px-4 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-orange-50/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{s.influencers?.name ?? '—'}</div>
                        <div className="text-xs text-gray-500">
                          {s.influencers?.ref_code} {s.influencers?.payout_iban ? `· IBAN ✓` : '· IBAN eksik'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        #{s.orders?.order_number ?? s.order_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        ₺{Number(s.order_total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-green-700">
                        ₺{Number(s.commission_amount).toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">
                          (%{s.commission_percent})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={SALE_STATUS_VARIANT[s.status] ?? 'default'}>
                          {SALE_STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(s.created_at).toLocaleDateString('tr-TR')}
                        {s.paid_at && (
                          <div className="text-xs text-green-600">
                            Ödendi: {new Date(s.paid_at).toLocaleDateString('tr-TR')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <SaleActions id={s.id} status={s.status} />
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

  // Influencer list with stats
  let q = (supabase as any)
    .from('influencer_stats')
    .select('*')
    .order('influencer_id', { ascending: false })
    .limit(200)
  if (tab !== 'all') q = q.eq('status', tab)
  const { data: statsData } = await q

  const ids = (statsData ?? []).map((s: any) => s.influencer_id)
  const { data: details } = ids.length
    ? await (supabase as any)
        .from('influencers')
        .select('id, email, social_handle, social_platform, follower_count, payout_iban, rejection_reason, created_at')
        .in('id', ids)
    : { data: [] }
  const detailMap = new Map<string, any>(
    (details ?? []).map((d: any) => [d.id, d])
  )

  const rows = ((statsData ?? []) as any[]).map((s) => ({
    ...s,
    id: s.influencer_id,
    ...(detailMap.get(s.influencer_id) ?? {}),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Influencer Yönetimi"
        description="Influencer başvurularını ve performansı yönetin."
      />
      <TabBar items={tabs} value={tab} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Toplam Influencer" value={String(allForCount?.length ?? 0)} />
        <StatCard icon={Users} label="Onay Bekleyen" value={String(buckets.pending ?? 0)} />
        <StatCard icon={MousePointerClick} label="Onaylı" value={String(buckets.approved ?? 0)} />
        <StatCard icon={Wallet} label="Bekleyen Komisyon" value={String(pendingSalesCount ?? 0)} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Influencer yok"
            description="Bu filtre için kayıt bulunamadı."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">İsim</th>
                  <th className="text-left py-3 px-4 font-medium">Platform</th>
                  <th className="text-left py-3 px-4 font-medium">Ref Kodu</th>
                  <th className="text-left py-3 px-4 font-medium">Performans</th>
                  <th className="text-left py-3 px-4 font-medium">Kazanç</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-orange-50/30">
                    <td className="py-3 px-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.email ?? '—'}</div>
                      {r.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Red: {r.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="capitalize">{r.social_platform ?? '—'}</div>
                      <div className="text-xs text-gray-500">
                        {r.social_handle} {r.follower_count ? `· ${Number(r.follower_count).toLocaleString('tr-TR')}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">
                      {r.ref_code}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>{r.clicks_count ?? 0} tıklama</div>
                      <div className="text-xs text-gray-500">
                        {r.sales_count ?? 0} satış
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="text-green-700 font-medium">
                        ₺{Number(r.confirmed_earnings ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Bekleyen: ₺{Number(r.pending_earnings ?? 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        %{Number(r.commission_percent).toFixed(1)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ModerationActions
                        id={r.id}
                        status={r.status}
                        defaultCommission={Number(r.commission_percent) || 5}
                      />
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
