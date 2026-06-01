'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function approveAdCampaign(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('ad_campaigns')
    .update({ status: 'approved', rejection_reason: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/reklamlar')
}

export async function rejectAdCampaign(id: string, reason: string) {
  const { supabase } = await requireAdmin()
  if (!reason || reason.trim().length < 3) {
    throw new Error('Red sebebi en az 3 karakter olmalı.')
  }
  const { error } = await (supabase as any)
    .from('ad_campaigns')
    .update({ status: 'rejected', rejection_reason: reason.trim(), is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/reklamlar')
}

export async function pauseAdCampaign(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('ad_campaigns')
    .update({ status: 'paused', is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/reklamlar')
}
