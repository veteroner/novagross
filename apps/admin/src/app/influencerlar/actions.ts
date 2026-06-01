'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function approveInfluencer(id: string, commissionPercent: number) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('influencers')
    .update({
      status: 'approved',
      commission_percent: commissionPercent,
      rejection_reason: null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/influencerlar')
}

export async function rejectInfluencer(id: string, reason: string) {
  const { supabase } = await requireAdmin()
  if (!reason || reason.trim().length < 3) {
    throw new Error('Red sebebi en az 3 karakter olmalı.')
  }
  const { error } = await (supabase as any)
    .from('influencers')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/influencerlar')
}

export async function suspendInfluencer(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('influencers')
    .update({ status: 'suspended' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/influencerlar')
}

export async function confirmAffiliateSale(saleId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('affiliate_sales')
    .update({ status: 'confirmed' })
    .eq('id', saleId)
  if (error) throw new Error(error.message)
  revalidatePath('/influencerlar')
}

export async function markAffiliateSalePaid(saleId: string) {
  const { supabase } = await requireAdmin()
  const { error } = await (supabase as any)
    .from('affiliate_sales')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', saleId)
  if (error) throw new Error(error.message)
  revalidatePath('/influencerlar')
}
