'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export async function acceptOffer(id: string) {
  const { supabase, storeId } = await requireSeller('/avantajli-teklifler')
  // RLS gerçek garantor; biz de double-check edelim
  const { data: offer } = await (supabase as any)
    .from('platform_offers')
    .select('id, store_id, status, ends_at')
    .eq('id', id)
    .single()

  if (!offer) throw new Error('Teklif bulunamadı.')
  if (offer.store_id && offer.store_id !== storeId) {
    throw new Error('Bu teklifi kabul etme yetkiniz yok.')
  }
  if (offer.status !== 'pending') {
    throw new Error('Bu teklif artık yanıtlanamıyor.')
  }

  const { error } = await (supabase as any)
    .from('platform_offers')
    .update({
      status: 'accepted',
      seller_response_at: new Date().toISOString(),
      store_id: storeId, // global teklif kabul edilirse storeId atanır
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/avantajli-teklifler')
}

export async function rejectOffer(id: string, reason: string) {
  const { supabase, storeId } = await requireSeller('/avantajli-teklifler')
  if (!reason || reason.trim().length < 3) {
    throw new Error('Red sebebi en az 3 karakter olmalı.')
  }

  const { data: offer } = await (supabase as any)
    .from('platform_offers')
    .select('id, store_id, status')
    .eq('id', id)
    .single()
  if (!offer) throw new Error('Teklif bulunamadı.')
  if (offer.store_id && offer.store_id !== storeId) {
    throw new Error('Bu teklifi reddetme yetkiniz yok.')
  }
  if (offer.status !== 'pending') {
    throw new Error('Bu teklif artık yanıtlanamıyor.')
  }

  const { error } = await (supabase as any)
    .from('platform_offers')
    .update({
      status: 'rejected',
      rejection_reason: reason.trim(),
      seller_response_at: new Date().toISOString(),
      store_id: storeId,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/avantajli-teklifler')
}
