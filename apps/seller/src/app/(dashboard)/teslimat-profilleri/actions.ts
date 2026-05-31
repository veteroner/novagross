'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type ShippingProfileInput = {
  method_id: string
  custom_base_price?: number | null
  custom_free_shipping_threshold?: number | null
  processing_time_days?: number | null
  is_enabled: boolean
}

export async function upsertShippingProfile(input: ShippingProfileInput) {
  const { supabase, storeId } = await requireSeller('/teslimat-profilleri')

  if (!input.method_id) throw new Error('Kargo yöntemi seçilmeli.')

  const row = {
    store_id: storeId,
    method_id: input.method_id,
    custom_base_price: input.custom_base_price ?? null,
    custom_free_shipping_threshold: input.custom_free_shipping_threshold ?? null,
    processing_time_days: input.processing_time_days ?? 1,
    is_enabled: input.is_enabled,
    updated_at: new Date().toISOString(),
  }

  // store_id + method_id'ye göre upsert
  const { error } = await (supabase as any)
    .from('store_shipping_settings')
    .upsert(row, { onConflict: 'store_id,method_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/teslimat-profilleri')
}

export async function toggleProfileActive(methodId: string, isEnabled: boolean) {
  const { supabase, storeId } = await requireSeller('/teslimat-profilleri')
  const { error } = await (supabase as any)
    .from('store_shipping_settings')
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('method_id', methodId)
  if (error) throw new Error(error.message)
  revalidatePath('/teslimat-profilleri')
}
