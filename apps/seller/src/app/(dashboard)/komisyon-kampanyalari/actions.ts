'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export async function joinCommissionCampaign(campaignId: string, productIds: string[]) {
  const { supabase, storeId } = await requireSeller('/komisyon-kampanyalari')
  if (productIds.length === 0) return

  // Sadece bu mağazaya ait ürünler eklenebilir
  const { data: ownProducts } = await (supabase as any)
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .in('id', productIds)
  const ownIds = new Set((ownProducts ?? []).map((p: any) => p.id))

  const rows = productIds
    .filter((id) => ownIds.has(id))
    .map((id) => ({ campaign_id: campaignId, product_id: id, store_id: storeId }))

  if (rows.length === 0) return

  // upsert: aynı (campaign, product) varsa yoksay
  const { error } = await (supabase as any)
    .from('commission_campaign_products')
    .upsert(rows, { onConflict: 'campaign_id,product_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  revalidatePath('/komisyon-kampanyalari')
}

export async function leaveCommissionCampaign(campaignId: string, productId: string) {
  const { supabase, storeId } = await requireSeller('/komisyon-kampanyalari')
  const { error } = await (supabase as any)
    .from('commission_campaign_products')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('product_id', productId)
    .eq('store_id', storeId)
  if (error) throw new Error(error.message)
  revalidatePath('/komisyon-kampanyalari')
}
