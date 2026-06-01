import { Card, PageHeader, EmptyState, StatCard } from '@novagross/ui'
import { Megaphone, Eye, MousePointerClick, DollarSign } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { AdCampaignForm } from './ad-campaign-form'
import { CampaignRow } from './campaign-row'

export const dynamic = 'force-dynamic'

export default async function SellerAdsPage() {
  const { supabase, storeId } = await requireSeller('/reklam')

  const [statsRes, productsRes, categoriesRes] = await Promise.all([
    (supabase as any)
      .from('ad_campaign_stats')
      .select('*')
      .eq('store_id', storeId)
      .order('campaign_id', { ascending: false }),
    supabase
      .from('products')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('name'),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
  ])

  // Stats view, campaign tablosundan tüm alanlara erişim sağlıyor ama ek bilgiler (is_active, rejection_reason vs)
  // join'i yok. Bu yüzden ek bir çağrı:
  const { data: campaignsExtra } = await (supabase as any)
    .from('ad_campaigns')
    .select('id, is_active, rejection_reason, starts_at, ends_at')
    .eq('store_id', storeId)

  const extraMap = new Map<string, any>(
    (campaignsExtra ?? []).map((c: any) => [c.id, c])
  )

  const campaigns = (statsRes.data ?? []).map((s: any) => ({
    ...s,
    id: s.campaign_id,
    ...(extraMap.get(s.campaign_id) ?? {}),
  }))

  // Toplam istatistikler
  const totalImpressions = campaigns.reduce(
    (a: number, c: any) => a + Number(c.impressions ?? 0),
    0
  )
  const totalClicks = campaigns.reduce(
    (a: number, c: any) => a + Number(c.clicks ?? 0),
    0
  )
  const totalSpent = campaigns.reduce(
    (a: number, c: any) => a + Number(c.spent_total ?? 0),
    0
  )
  const activeCount = campaigns.filter(
    (c: any) => c.status === 'approved' && c.is_active
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reklam Kampanyaları"
        description="Sponsorlu ürün, marka ve kategori reklamları ile ürünlerinizi öne çıkarın. Reklamlar admin onayından geçer."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Megaphone}
          label="Aktif Kampanya"
          value={String(activeCount)}
        />
        <StatCard
          icon={Eye}
          label="Toplam Gösterim"
          value={totalImpressions.toLocaleString('tr-TR')}
        />
        <StatCard
          icon={MousePointerClick}
          label="Toplam Tıklama"
          value={totalClicks.toLocaleString('tr-TR')}
        />
        <StatCard
          icon={DollarSign}
          label="Toplam Harcama"
          value={`₺${totalSpent.toFixed(2)}`}
        />
      </div>

      <AdCampaignForm
        products={(productsRes.data ?? []) as any}
        categories={(categoriesRes.data ?? []) as any}
      />

      <Card>
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Kampanyalarım</h2>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Henüz kampanyanız yok"
            description="İlk reklam kampanyanızı yukarıdan oluşturun."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Kampanya</th>
                  <th className="text-left py-3 px-4 font-medium">Tip</th>
                  <th className="text-left py-3 px-4 font-medium">Bütçe</th>
                  <th className="text-left py-3 px-4 font-medium">Performans</th>
                  <th className="text-left py-3 px-4 font-medium">Harcama</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => (
                  <CampaignRow key={c.id} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
