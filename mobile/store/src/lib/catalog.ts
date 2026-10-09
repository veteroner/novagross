import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// Yalnızca yayındaki ürünler: RLS "Public can view approved products" (approved + is_active)

export type ProductCard = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number
  image: string | null
}

export type ProductDetail = ProductCard & {
  description: string | null
  brand: string | null
  images: string[]
  store: { id: string; store_name: string; store_slug: string; free_shipping_threshold: number | null } | null
  category_id: string | null
}

const CARD_SELECT = 'id, name, slug, price, compare_at_price, stock, product_images(url, is_primary, sort_order)'

function primaryImage(imgs: any[] | null | undefined): string | null {
  const sorted = [...(imgs ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
  return sorted[0]?.url ?? null
}

export function toCard(p: any): ProductCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
    stock: Number(p.stock ?? 0),
    image: primaryImage(p.product_images),
  }
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const [banners, categories, products] = await Promise.all([
        supabase
          .from('banners')
          .select('id, title, image_url, link_type, link_value')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('sort_order'),
        supabase.from('categories').select('id, name, image_url').eq('is_active', true).is('parent_id', null).order('sort_order'),
        supabase
          .from('products')
          .select(CARD_SELECT)
          .eq('approval_status', 'approved')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      return {
        banners: (banners.data ?? []) as { id: string; title: string; image_url: string; link_type: string | null; link_value: string | null }[],
        categories: (categories.data ?? []) as { id: string; name: string; image_url: string | null }[],
        products: (products.data ?? []).map(toCard),
      }
    },
  })
}

export function useCategories(parentId: string | null) {
  return useQuery({
    queryKey: ['categories', parentId],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      let q = supabase.from('categories').select('id, name, image_url, parent_id').eq('is_active', true).order('sort_order')
      q = parentId ? q.eq('parent_id', parentId) : q.is('parent_id', null)
      const { data } = await q
      return (data ?? []) as { id: string; name: string; image_url: string | null }[]
    },
  })
}

/** Kategori (alt kategoriler dahil) veya arama metniyle ürün listesi */
export function useProductList(opts: { categoryId?: string | null; search?: string; sort?: 'new' | 'price_asc' | 'price_desc' }) {
  const { categoryId = null, search = '', sort = 'new' } = opts
  return useQuery({
    queryKey: ['products', categoryId, search, sort],
    enabled: !!categoryId || search.trim().length >= 2,
    queryFn: async () => {
      let categoryIds: string[] | null = null
      if (categoryId) {
        const { data: kids } = await supabase.from('categories').select('id').eq('parent_id', categoryId)
        categoryIds = [categoryId, ...(kids ?? []).map((k: any) => k.id)]
      }
      let q = supabase.from('products').select(CARD_SELECT).eq('approval_status', 'approved').eq('is_active', true)
      if (categoryIds) q = q.in('category_id', categoryIds)
      if (search.trim()) q = q.ilike('name', `%${search.trim().replace(/[%_]/g, '')}%`)
      q =
        sort === 'price_asc'
          ? q.order('price', { ascending: true })
          : sort === 'price_desc'
            ? q.order('price', { ascending: false })
            : q.order('created_at', { ascending: false })
      const { data, error } = await q.limit(100)
      if (error) throw error
      return (data ?? []).map(toCard)
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<ProductDetail | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, slug, price, compare_at_price, stock, description, brand, category_id, product_images(url, is_primary, sort_order), store:store_id(id, store_name, store_slug, free_shipping_threshold)'
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const p: any = data
      const imgs = [...(p.product_images ?? [])]
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
        .map((i) => i.url)
      return { ...toCard(p), description: p.description, brand: p.brand, images: imgs, store: p.store ?? null, category_id: p.category_id }
    },
  })
}

export type ProductReview = {
  id: string
  rating: number
  title: string | null
  comment: string | null
  created_at: string
  seller_reply: string | null
  seller_reply_approved: boolean | null
}

/** Onaylı yorumlar (RLS: herkese açık yalnızca is_approved) */
export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async (): Promise<ProductReview[]> => {
      const { data } = await (supabase as any)
        .from('reviews')
        .select('id, rating, title, comment, created_at, seller_reply, seller_reply_approved')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20)
      return data ?? []
    },
  })
}
