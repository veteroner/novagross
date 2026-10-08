import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { toCard, type ProductCard } from './catalog'
import { useAuth } from '@/providers/auth'

// Sepet veritabanında (carts / cart_items) — web sepetiyle senkron. RLS: kullanıcının kendi sepeti.

export type CartLine = { id: string; quantity: number; product: ProductCard & { store_id: string | null } }

async function ensureCartId(userId: string): Promise<string> {
  const { data } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle()
  if (data) return (data as any).id
  const { data: created, error } = await supabase.from('carts').insert({ user_id: userId }).select('id').single()
  if (error) throw error
  return (created as any).id
}

export function useCart() {
  const { session } = useAuth()
  const uid = session?.user.id
  return useQuery({
    queryKey: ['cart', uid],
    enabled: !!uid,
    queryFn: async (): Promise<CartLine[]> => {
      const { data: cart } = await supabase.from('carts').select('id').eq('user_id', uid!).maybeSingle()
      if (!cart) return []
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, quantity, product:product_id(id, name, slug, price, compare_at_price, stock, store_id, approval_status, is_active, product_images(url, is_primary, sort_order))')
        .eq('cart_id', (cart as any).id)
        .order('created_at')
      if (error) throw error
      return (data ?? [])
        .filter((r: any) => r.product) // yayından kalkan ürün RLS ile görünmez
        .map((r: any) => ({ id: r.id, quantity: r.quantity, product: { ...toCard(r.product), store_id: r.product.store_id } }))
    },
  })
}

export function useCartActions() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const uid = session?.user.id
  const refresh = () => qc.invalidateQueries({ queryKey: ['cart'] })

  const add = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      if (!uid) throw new Error('Giriş yapmanız gerekiyor')
      const cartId = await ensureCartId(uid)
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', productId)
        .maybeSingle()
      if (existing) {
        await supabase.from('cart_items').update({ quantity: (existing as any).quantity + quantity }).eq('id', (existing as any).id)
      } else {
        const { error } = await supabase.from('cart_items').insert({ cart_id: cartId, product_id: productId, quantity })
        if (error) throw error
      }
    },
    onSuccess: refresh,
  })

  const setQuantity = useMutation({
    mutationFn: async ({ lineId, quantity }: { lineId: string; quantity: number }) => {
      if (quantity <= 0) await supabase.from('cart_items').delete().eq('id', lineId)
      else await supabase.from('cart_items').update({ quantity }).eq('id', lineId)
    },
    onSuccess: refresh,
  })

  const clear = async () => {
    if (!uid) return
    const { data: cart } = await supabase.from('carts').select('id').eq('user_id', uid).maybeSingle()
    if (cart) await supabase.from('cart_items').delete().eq('cart_id', (cart as any).id)
    refresh()
  }

  return { add, setQuantity, clear }
}

export function useWishlist() {
  const { session } = useAuth()
  const uid = session?.user.id
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['wishlist', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from('wishlists')
        .select('id, product:product_id(id, name, slug, price, compare_at_price, stock, product_images(url, is_primary, sort_order))')
        .eq('user_id', uid!)
        .order('created_at', { ascending: false })
      return (data ?? []).filter((r: any) => r.product).map((r: any) => ({ id: r.id, product: toCard(r.product) }))
    },
  })
  const ids = new Set((query.data ?? []).map((w) => w.product.id))
  const toggle = async (productId: string) => {
    if (!uid) throw new Error('Giriş yapmanız gerekiyor')
    if (ids.has(productId)) await supabase.from('wishlists').delete().eq('user_id', uid).eq('product_id', productId)
    else await supabase.from('wishlists').insert({ user_id: uid, product_id: productId })
    qc.invalidateQueries({ queryKey: ['wishlist'] })
  }
  return { ...query, ids, toggle }
}
