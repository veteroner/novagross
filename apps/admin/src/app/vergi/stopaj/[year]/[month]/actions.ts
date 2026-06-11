'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function markSubmitted(periodId: string, reference: string) {
  const { userId } = await requireAdmin('/vergi/stopaj')
  if (!reference || reference.trim().length < 3) {
    throw new Error('GİB tahakkuk numarası gerekli (min 3 karakter).')
  }
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('withholding_periods')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: userId,
      submission_reference: reference.trim(),
    })
    .eq('id', periodId)
  if (error) throw new Error(error.message)
  revalidatePath('/vergi/stopaj')
}

export async function markPaid(periodId: string, reference: string) {
  await requireAdmin('/vergi/stopaj')
  if (!reference || reference.trim().length < 3) {
    throw new Error('Banka dekont referansı gerekli.')
  }
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('withholding_periods')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: reference.trim(),
    })
    .eq('id', periodId)
  if (error) throw new Error(error.message)
  revalidatePath('/vergi/stopaj')
}

export async function closePeriod(periodId: string) {
  await requireAdmin('/vergi/stopaj')
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('withholding_periods')
    .update({ status: 'closed' })
    .eq('id', periodId)
  if (error) throw new Error(error.message)
  revalidatePath('/vergi/stopaj')
}
