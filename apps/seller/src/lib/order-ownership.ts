import { createClient } from '@/lib/supabase/server'

export async function assertSellerOwnsOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderId: string
) {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (storeError) throw storeError
  if (!store?.id) return { ok: false as const, storeId: null }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('store_id', store.id)
    .limit(1)

  if (itemsError) throw itemsError
  return { ok: (items?.length ?? 0) > 0, storeId: store.id }
}
