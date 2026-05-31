'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ClaimType = 'return' | 'exchange' | 'complaint' | 'damage' | 'missing'

const VALID: ClaimType[] = ['return', 'exchange', 'complaint', 'damage', 'missing']

export async function createCustomerClaim(input: {
  orderId: string
  orderItemId: string
  claimType: ClaimType
  reason: string
  description?: string
}) {
  if (!VALID.includes(input.claimType)) throw new Error('Geçersiz talep tipi.')
  if (!input.reason?.trim()) throw new Error('Sebep gerekli.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Giriş yapmanız gerekiyor.')

  // Fetch order_item to verify ownership + obtain store_id
  const { data: item, error: itemErr } = await supabase
    .from('order_items')
    .select('id, store_id, order_id')
    .eq('id', input.orderItemId)
    .single()
  if (itemErr || !item) throw new Error('Sipariş kalemi bulunamadı.')
  if (item.order_id !== input.orderId) throw new Error('Sipariş eşleşmiyor.')
  if (!item.store_id) throw new Error('Bu ürün için satıcı bilgisi yok.')

  const { error } = await (supabase as any).from('customer_claims').insert({
    order_id: input.orderId,
    order_item_id: input.orderItemId,
    customer_id: user.id,
    store_id: item.store_id,
    claim_type: input.claimType,
    reason: input.reason.trim(),
    description: input.description?.trim() || null,
    status: 'open',
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/hesabim/siparislerim/${input.orderId}`)
}
