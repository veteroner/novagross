'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// ---------- Product reviews ----------

export async function approveReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase
    .from('reviews')
    .update({ is_approved: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

export async function unapproveReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase
    .from('reviews')
    .update({ is_approved: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

export async function deleteReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

// ---------- Store reviews ----------

export async function hideStoreReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase
    .from('store_reviews')
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

export async function unhideStoreReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase
    .from('store_reviews')
    .update({ is_hidden: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

export async function deleteStoreReview(id: string) {
  const { supabase } = await requireAdmin('/yorumlar')
  const { error } = await supabase.from('store_reviews').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}
