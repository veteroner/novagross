'use server'

import { revalidatePath } from 'next/cache'
import { generateReturnShipment } from '@novagross/cargo'
import { requireSeller, roleAtLeast } from '@/lib/auth/requireSeller'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type ReturnDecision = 'approve' | 'reject'

/**
 * Satıcı iade talebini onaylar / reddeder.
 * Yetki DB'de: approve/reject_return_request RPC'leri mağaza 'manager'+ üyesine izin verir.
 * Onayda MNG iade kargosu (best-effort) üretilir; müşteriye e-posta kuyruğa atılır.
 * Para iadesi (iyzico) admin tarafında yapılır.
 */
export async function decideReturn(
  requestId: string,
  decision: ReturnDecision,
  note?: string
): Promise<{ ok: true; shipmentError?: string | null }> {
  const { supabase, userId, storeId, role } = await requireSeller('/talepler?tab=iadeler')

  if (!roleAtLeast(role, 'manager')) {
    throw new Error('İade kararını yalnızca mağaza sahibi veya yöneticisi verebilir.')
  }

  // Talep bu mağazaya mı ait? (RLS: satıcı kendi mağazasının taleplerini görebilir)
  const { data: rr } = await (supabase as any)
    .from('return_requests')
    .select('id, store_id, status')
    .eq('id', requestId)
    .maybeSingle()
  if (!rr || rr.store_id !== storeId) throw new Error('İade talebi bulunamadı.')
  if (rr.status !== 'pending') throw new Error('Bu talep zaten sonuçlandırılmış.')

  const trimmed = (note ?? '').trim()

  if (decision === 'approve') {
    const { error } = await (supabase as any).rpc('approve_return_request', {
      p_request_id: requestId,
      p_admin_id: userId,
      p_admin_note: trimmed || null,
    })
    if (error) throw new Error(error.message)
  } else {
    if (trimmed.length < 5) throw new Error('Red gerekçesi en az 5 karakter olmalı.')
    const { error } = await (supabase as any).rpc('reject_return_request', {
      p_request_id: requestId,
      p_admin_id: userId,
      p_rejection_reason: trimmed,
    })
    if (error) throw new Error(error.message)
  }

  const service = createServiceRoleClient()
  let shipmentError: string | null = null

  if (decision === 'approve') {
    await generateReturnShipment(service, requestId)
    const { data: after } = await (service as any)
      .from('return_requests')
      .select('return_shipment_error')
      .eq('id', requestId)
      .maybeSingle()
    shipmentError = after?.return_shipment_error ?? null
  }

  // Müşteriye e-posta (best-effort)
  try {
    const { data: request } = await (service as any)
      .from('return_requests')
      .select('user_id, quantity, refund_amount, orders ( order_number ), order_items ( name )')
      .eq('id', requestId)
      .single()
    const { data: customer } = await (service as any)
      .from('profiles')
      .select('email, first_name')
      .eq('id', request?.user_id)
      .single()

    if (customer?.email && request) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'
      const orderNumber = request.orders?.order_number ?? ''
      await (service as any).from('email_queue').insert({
        recipient: customer.email,
        template: decision === 'approve' ? 'returns/approved' : 'returns/rejected',
        subject:
          decision === 'approve'
            ? `Novagross | İadeniz onaylandı - #${orderNumber}`
            : `Novagross | İade talebiniz reddedildi - #${orderNumber}`,
        data: {
          orderNumber,
          customerName: customer.first_name || 'Müşterimiz',
          productName: request.order_items?.name,
          quantity: request.quantity,
          refundAmount: request.refund_amount,
          myReturnsUrl: `${siteUrl}/hesabim/iadelerim`,
          adminNote: decision === 'approve' ? trimmed || undefined : undefined,
          rejectionReason: decision === 'reject' ? trimmed : undefined,
        },
        priority: 'medium',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
      })
    }
  } catch (e) {
    console.warn('[decideReturn] email failed', e)
  }

  revalidatePath('/talepler')
  return { ok: true, shipmentError }
}
