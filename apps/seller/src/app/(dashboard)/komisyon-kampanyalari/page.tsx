import { PageHeader, EmptyState } from '@novagross/ui'
import { Percent } from 'lucide-react'
import { requireSellerRole } from '@/lib/auth/requireSeller'
import { CommissionCampaignList } from './commission-campaign-list'

export const dynamic = 'force-dynamic'

export default async function SellerCommissionCampaignsPage() {
  const { supabase, storeId } = await requireSellerRole('manager', '/komisyon-kampanyalari')
  const nowIso = new Date().toISOString()

  // Aktif komisyon kampanyaları
  const { data: campaigns } = await (supabase as any)
    .from('commission_campaigns')
    .select('id, name, description, discounted_commission_rate, category_ids, min_price, ends_at')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })

  // Satıcının aktif/onaylı ürünleri
  const { data: products } = await (supabase as any)
    .from('products')
    .select('id, name, price, category_id')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('name')

  // Satıcının mevcut katılımları
  const { data: joined } = await (supabase as any)
    .from('commission_campaign_products')
    .select('campaign_id, product_id')
    .eq('store_id', storeId)

  const joinedMap: Record<string, string[]> = {}
  for (const row of (joined ?? []) as any[]) {
    ;(joinedMap[row.campaign_id] ??= []).push(row.product_id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komisyon İndirimli Kampanyalar"
        description="Platformun açtığı komisyon indirimi kampanyalarına ürünlerinizi ekleyin. Katılan ürünlerde satış sırasında indirimli komisyon uygulanır."
      />

      {!campaigns || campaigns.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Aktif kampanya yok"
          description="Şu anda katılabileceğiniz bir komisyon indirimi kampanyası bulunmuyor."
        />
      ) : (
        <CommissionCampaignList
          campaigns={campaigns as any}
          products={(products ?? []) as any}
          joinedMap={joinedMap}
        />
      )}
    </div>
  )
}
