'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

/** Seller reply on a product review (own products only via RLS). */
export async function replyToProductReview(reviewId: string, reply: string) {
  if (!reply || reply.trim().length < 2) {
    throw new Error('Yanıt çok kısa.')
  }
  const { supabase } = await requireSeller('/yorumlar')
  const { error } = await supabase
    .from('reviews')
    .update({
      seller_reply: reply.trim(),
      seller_reply_at: new Date().toISOString(),
      seller_reply_approved: null, // pending admin moderation
    } as any)
    .eq('id', reviewId)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}

export async function replyToStoreReview(reviewId: string, reply: string) {
  if (!reply || reply.trim().length < 2) {
    throw new Error('Yanıt çok kısa.')
  }
  const { supabase } = await requireSeller('/yorumlar')
  const { error } = await supabase
    .from('store_reviews')
    .update({
      seller_reply: reply.trim(),
      seller_reply_at: new Date().toISOString(),
      seller_reply_approved: null,
    } as any)
    .eq('id', reviewId)
  if (error) throw new Error(error.message)
  revalidatePath('/yorumlar')
}
