'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

// İptal edilen siparişin iyzico iadesi /api/iyzico/process-refunds (pg_cron) ile
// otomatik yapılır. Bunlar yalnızca başarısız/takılı kalan iadeler için.

/** Başarısız (ya da 'processing'de takılı) iadeyi kuyruğa geri koyar. */
export async function retryOrderRefund(orderId: string) {
  await requireAdmin(`/siparisler/${orderId}`)
  const service: any = createServiceRoleClient()
  const { error } = await service
    .from('orders')
    .update({ refund_status: 'pending', refund_attempts: 0, refund_error: null })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .in('refund_status', ['failed', 'processing'])
  if (error) throw new Error(error.message)
  revalidatePath(`/siparisler/${orderId}`)
}

/** iyzico panelinden elle iade edildi → sistemde iade edildi olarak işle (defter ters kaydı dahil). */
export async function markOrderRefundedManually(orderId: string, note: string) {
  const { supabase } = await requireAdmin(`/siparisler/${orderId}`)
  const { data, error } = await (supabase as any).rpc('mark_order_refunded_manually', {
    p_order_id: orderId,
    p_note: note || null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Sipariş ödenmiş durumda değil (zaten iade edilmiş olabilir)')
  revalidatePath(`/siparisler/${orderId}`)
}
