import { requireSeller } from '@/lib/auth/requireSeller'
import { CampaignsClient, type CampaignRow } from './campaigns-client'

export const dynamic = 'force-dynamic'

export default async function SellerCampaignsPage() {
  const { supabase, storeId } = await requireSeller('/kampanyalar')

  const [{ data: campaigns }, { data: products }, { data: categories }] = await Promise.all([
    (supabase as any)
      .from('store_campaigns')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('products').select('id, name').eq('store_id', storeId).order('name'),
    supabase.from('categories').select('id, name').order('name'),
  ])

  return (
    <CampaignsClient
      campaigns={(campaigns ?? []) as CampaignRow[]}
      products={(products ?? []) as { id: string; name: string }[]}
      categories={(categories ?? []) as { id: string; name: string }[]}
    />
  )
}
