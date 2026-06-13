'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type CommissionCampaignInput = {
  name: string
  description: string | null
  discounted_commission_rate: number
  category_ids: string[]
  min_price: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export async function createCommissionCampaign(input: CommissionCampaignInput) {
  const { userId } = await requireAdmin('/komisyon-kampanyalari')

  if (!input.name || input.name.trim().length < 3) {
    throw new Error('Kampanya adı en az 3 karakter olmalı.')
  }
  const rate = Number(input.discounted_commission_rate)
  if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
    throw new Error('İndirimli komisyon oranı 0–50 arasında olmalı.')
  }

  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any).from('commission_campaigns').insert({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    discounted_commission_rate: rate,
    category_ids: input.category_ids.length > 0 ? input.category_ids : null,
    min_price: Number(input.min_price) || 0,
    starts_at: input.starts_at || new Date().toISOString(),
    ends_at: input.ends_at || null,
    is_active: input.is_active,
    created_by: userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/komisyon-kampanyalari')
}

export async function updateCommissionCampaign(
  id: string,
  patch: Partial<CommissionCampaignInput>
) {
  await requireAdmin('/komisyon-kampanyalari')
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('commission_campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/komisyon-kampanyalari')
}

export async function deleteCommissionCampaign(id: string) {
  await requireAdmin('/komisyon-kampanyalari')
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any).from('commission_campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/komisyon-kampanyalari')
}
