import { createClient } from '@/lib/supabase/server'

export async function assertSellerOwnsOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderId: string
) {
  // Mağazayı üyelik üzerinden çöz (sahip/yönetici/personel)
  const { data: membership } = await (supabase as any).rpc('get_my_store')
  const myStore = Array.isArray(membership) ? membership[0] : membership
  if (!myStore?.store_id) return { ok: false as const, storeId: null }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('store_id', myStore.store_id)
    .limit(1)

  if (itemsError) throw itemsError
  return { ok: (items?.length ?? 0) > 0, storeId: myStore.store_id }
}
