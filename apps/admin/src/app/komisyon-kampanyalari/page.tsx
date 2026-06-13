import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { CommissionCampaignsClient } from './commission-campaigns-client'

export const dynamic = 'force-dynamic'

export default async function CommissionCampaignsPage() {
  await requireAdmin('/komisyon-kampanyalari')
  const supabase = createServiceRoleClient()

  const [campaignsRes, categoriesRes] = await Promise.all([
    (supabase as any)
      .from('commission_campaigns')
      .select('*')
      .order('created_at', { ascending: false }),
    (supabase as any).from('categories').select('id, name').eq('is_active', true).order('name'),
  ])

  // Her kampanyanın katılan ürün sayısı
  const campaigns = (campaignsRes.data ?? []) as any[]
  const counts = new Map<string, number>()
  if (campaigns.length > 0) {
    const { data: cp } = await (supabase as any)
      .from('commission_campaign_products')
      .select('campaign_id')
      .in('campaign_id', campaigns.map((c) => c.id))
    for (const row of (cp ?? []) as any[]) {
      counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1)
    }
  }
  const campaignsWithCount = campaigns.map((c) => ({ ...c, product_count: counts.get(c.id) ?? 0 }))

  return (
    <CommissionCampaignsClient
      campaigns={campaignsWithCount}
      categories={(categoriesRes.data ?? []) as any}
    />
  )
}
