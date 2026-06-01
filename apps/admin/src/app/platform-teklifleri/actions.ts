'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export type PlatformOfferInput = {
  store_id: string | null
  title: string
  description: string | null
  offer_type:
    | 'commission_discount'
    | 'co_funded_discount'
    | 'free_shipping_support'
    | 'fee_waiver'
  platform_share_percent: number | null
  platform_share_amount: number | null
  required_seller_discount_percent: number | null
  required_min_stock: number
  product_ids: string[]
  category_ids: string[]
  ends_at: string
  response_deadline: string | null
}

export async function createPlatformOffer(input: PlatformOfferInput) {
  const { supabase, userId } = await requireAdmin()

  if (!input.title || input.title.trim().length < 3) {
    throw new Error('Başlık en az 3 karakter olmalı.')
  }
  if (!input.ends_at) {
    throw new Error('Bitiş tarihi zorunlu.')
  }

  const { error } = await (supabase as any).from('platform_offers').insert({
    store_id: input.store_id,
    title: input.title.trim(),
    description: input.description,
    offer_type: input.offer_type,
    platform_share_percent: input.platform_share_percent,
    platform_share_amount: input.platform_share_amount,
    required_seller_discount_percent: input.required_seller_discount_percent,
    required_min_stock: input.required_min_stock,
    product_ids: input.product_ids,
    category_ids: input.category_ids,
    ends_at: input.ends_at,
    response_deadline: input.response_deadline,
    created_by: userId,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/platform-teklifleri')
}

export async function cancelPlatformOffer(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('platform_offers')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/platform-teklifleri')
}
