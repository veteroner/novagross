'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export async function answerQuestion(questionId: string, answer: string) {
  if (!answer || answer.trim().length < 2) {
    throw new Error('Cevap çok kısa.')
  }
  const { supabase, userId } = await requireSeller('/sorular')
  const { error } = await (supabase as any)
    .from('product_questions')
    .update({
      answer: answer.trim(),
      answered_by: userId,
      answered_at: new Date().toISOString(),
      answer_status: 'pending', // admin moderation
    })
    .eq('id', questionId)
  if (error) throw new Error(error.message)
  revalidatePath('/sorular')
}
