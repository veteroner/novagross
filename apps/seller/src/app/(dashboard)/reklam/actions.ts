'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type AdCampaignInput = {
  name: string
  ad_type: 'sponsored_product' | 'sponsored_brand' | 'sponsored_category'
  product_ids: string[]
  brand_keyword?: string | null
  daily_budget: number
  bid_per_click: number
  keywords: string[]
  category_ids: string[]
  starts_at?: string | null
  ends_at?: string | null
}

export async function createAdCampaign(input: AdCampaignInput) {
  const { supabase, storeId } = await requireSeller('/reklam')

  if (!input.name || input.name.trim().length < 3) {
    throw new Error('Kampanya adı en az 3 karakter olmalı.')
  }
  if (input.daily_budget <= 0) {
    throw new Error('Günlük bütçe pozitif olmalı.')
  }
  if (input.bid_per_click <= 0) {
    throw new Error('Tıklama başına teklif pozitif olmalı.')
  }
  if (input.ad_type === 'sponsored_product' && input.product_ids.length === 0) {
    throw new Error('Sponsorlu Ürün reklamı için en az 1 ürün seçmelisiniz.')
  }
  if (input.ad_type === 'sponsored_brand' && !input.brand_keyword) {
    throw new Error('Sponsorlu Marka reklamı için marka kelimesi girmelisiniz.')
  }

  const { error } = await (supabase as any).from('ad_campaigns').insert({
    store_id: storeId,
    name: input.name.trim(),
    ad_type: input.ad_type,
    product_ids: input.product_ids,
    brand_keyword: input.brand_keyword || null,
    daily_budget: input.daily_budget,
    bid_per_click: input.bid_per_click,
    keywords: input.keywords,
    category_ids: input.category_ids,
    starts_at: input.starts_at || new Date().toISOString(),
    ends_at: input.ends_at || null,
    status: 'pending',
    is_active: true,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/reklam')
}

export async function updateAdCampaignStatus(
  id: string,
  is_active: boolean
) {
  const { supabase } = await requireSeller('/reklam')
  const { error } = await (supabase as any)
    .from('ad_campaigns')
    .update({ is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/reklam')
}

export async function deleteAdCampaign(id: string) {
  const { supabase } = await requireSeller('/reklam')
  const { error } = await (supabase as any)
    .from('ad_campaigns')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/reklam')
}
