'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export type ClaimStatus = 'open' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'

const VALID: ClaimStatus[] = ['open', 'in_progress', 'resolved', 'rejected', 'escalated']

export async function adminUpdateClaim(
  claimId: string,
  data: { status?: ClaimStatus; resolution?: string; refund_amount?: number | null }
) {
  const { supabase, userId } = await requireAdmin('/talepler')

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (data.status) {
    if (!VALID.includes(data.status)) throw new Error('Geçersiz durum.')
    update.status = data.status
    if (data.status === 'resolved' || data.status === 'rejected') {
      update.resolved_at = new Date().toISOString()
      update.resolved_by = userId
    }
  }
  if (data.resolution !== undefined) update.resolution = data.resolution?.trim() || null
  if (data.refund_amount !== undefined) update.refund_amount = data.refund_amount

  const { error } = await (supabase as any).from('customer_claims').update(update).eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidatePath('/talepler')
}
