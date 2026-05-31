'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type ClaimStatus = 'open' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'

const VALID: ClaimStatus[] = ['open', 'in_progress', 'resolved', 'rejected', 'escalated']

export async function updateClaim(
  claimId: string,
  data: {
    status?: ClaimStatus
    resolution?: string
    refund_amount?: number | null
    escalate?: boolean
  }
) {
  const { supabase, userId } = await requireSeller('/talepler')

  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

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
  if (data.escalate) {
    update.escalated_to_admin = true
    update.status = 'escalated'
  }
  if (!update.seller_responded_at) update.seller_responded_at = new Date().toISOString()

  const { error } = await (supabase as any).from('customer_claims').update(update).eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidatePath('/talepler')
}
