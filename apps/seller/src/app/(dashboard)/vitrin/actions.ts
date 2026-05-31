'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type StorefrontInput = {
  banner_url?: string | null
  banner_link?: string | null
  hero_title?: string | null
  hero_subtitle?: string | null
  about?: string | null
  featured_product_ids?: string[]
  featured_category_ids?: string[]
  theme_color?: string | null
  is_published: boolean
}

export async function saveStorefront(input: StorefrontInput) {
  const { supabase, storeId } = await requireSeller('/vitrin')

  const row = {
    store_id: storeId,
    banner_url: input.banner_url?.trim() || null,
    banner_link: input.banner_link?.trim() || null,
    hero_title: input.hero_title?.trim() || null,
    hero_subtitle: input.hero_subtitle?.trim() || null,
    about: input.about?.trim() || null,
    featured_product_ids: (input.featured_product_ids ?? []).slice(0, 10),
    featured_category_ids: (input.featured_category_ids ?? []).slice(0, 5),
    theme_color: input.theme_color?.trim() || '#16A34A',
    is_published: input.is_published,
    updated_at: new Date().toISOString(),
  }

  // Upsert by store_id (unique)
  const { error } = await (supabase as any)
    .from('store_storefront')
    .upsert(row, { onConflict: 'store_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/vitrin')
}
