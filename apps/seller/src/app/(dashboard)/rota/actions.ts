'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

/**
 * Update a product's price (and optionally compare_at_price) to apply a
 * discount suggested by the cart-pending list.
 */
export async function applyPriceSuggestion(productId: string, newPrice: number) {
  if (!Number.isFinite(newPrice) || newPrice <= 0) {
    throw new Error('Geçersiz fiyat.')
  }
  const { supabase, storeId } = await requireSeller('/rota')

  // Verify ownership
  const { data: existing, error: selErr } = await supabase
    .from('products')
    .select('id, price, compare_at_price, store_id')
    .eq('id', productId)
    .single()

  if (selErr || !existing) throw new Error('Ürün bulunamadı.')
  if (existing.store_id !== storeId) throw new Error('Bu ürün size ait değil.')
  if (Number(existing.price) <= newPrice) {
    throw new Error("Yeni fiyat, mevcut fiyattan büyük olamaz.")
  }

  // Preserve the previous price as compare_at_price for the strikethrough.
  const update: any = {
    price: newPrice,
    compare_at_price: existing.compare_at_price ?? existing.price,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('products').update(update).eq('id', productId)
  if (error) throw new Error(error.message)
  revalidatePath('/rota')
  revalidatePath('/urunler')
}
