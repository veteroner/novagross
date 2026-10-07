'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// Ürün değişiklik taslakları (products.pending_changes) — onay/red DB RPC'lerinde
// (is_admin() kontrolüyle) uygulanır; satıcıya bildirim RPC içinden gider.

export async function approveProductChanges(productId: string) {
  const { supabase } = await requireAdmin('/urunler/onay-bekleyenler')
  const { error } = await (supabase as any).rpc('approve_product_changes', { p_product_id: productId })
  if (error) throw new Error(error.message)
  revalidatePath('/urunler/onay-bekleyenler')
}

export async function rejectProductChanges(productId: string, reason: string) {
  const { supabase } = await requireAdmin('/urunler/onay-bekleyenler')
  const { error } = await (supabase as any).rpc('reject_product_changes', { p_product_id: productId, p_reason: reason })
  if (error) throw new Error(error.message)
  revalidatePath('/urunler/onay-bekleyenler')
}
