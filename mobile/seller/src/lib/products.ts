import { useQuery } from '@tanstack/react-query'
import { File } from 'expo-file-system'
import { supabase } from './supabase'
import { useAuth } from '@/providers/auth'

export type SellerProduct = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number
  is_active: boolean
  approval_status: 'pending' | 'approved' | 'rejected' | string
  rejection_reason: string | null
  category_id: string | null
  description: string | null
  created_at: string
  image: string | null
  /** Onaylı ürünün admin onayı bekleyen içerik taslağı (eski hal yayında) */
  pending_changes: Record<string, any> | null
  pending_changes_status: 'pending' | 'rejected' | null
  pending_changes_reason: string | null
}

export const APPROVAL: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  approved: { label: 'Yayında', tone: 'success' },
  pending: { label: 'Onay bekliyor', tone: 'warning' },
  rejected: { label: 'Reddedildi', tone: 'danger' },
}

export function useProducts() {
  const { store } = useAuth()
  return useQuery({
    queryKey: ['products', store?.storeId],
    enabled: !!store,
    queryFn: async (): Promise<SellerProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, slug, price, compare_at_price, stock, is_active, approval_status, rejection_reason, category_id, description, created_at, pending_changes, pending_changes_status, pending_changes_reason, product_images(url, is_primary, sort_order)'
        )
        .eq('store_id', store!.storeId)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []).map((p: any) => {
        const imgs = [...(p.product_images ?? [])].sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
        return { ...p, price: Number(p.price), stock: Number(p.stock), image: imgs[0]?.url ?? null }
      })
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      return (data ?? []) as { id: string; name: string }[]
    },
  })
}

// Web satıcı paneliyle aynı slug kuralı (apps/seller urunler/ekle)
export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Görseli product-images/<productId>/... altına yükler (storage politikası ilk klasörün
 * mağaza üyesinin ürünü olmasını şart koşar) ve product_images kaydını ekler.
 */
export async function uploadProductImages(productId: string, uris: { uri: string; mimeType?: string | null }[]) {
  const records: { product_id: string; url: string; sort_order: number; is_primary: boolean }[] = []
  for (const [i, img] of uris.entries()) {
    const mime = img.mimeType || 'image/jpeg'
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    const path = `${productId}/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const bytes = await new File(img.uri).arrayBuffer()
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('Görsel 8 MB üstünde olamaz.')
    const { error } = await supabase.storage.from('product-images').upload(path, bytes, { contentType: mime, upsert: false, cacheControl: '3600' })
    if (error) throw new Error(`Görsel yüklenemedi: ${error.message}`)
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    records.push({ product_id: productId, url: data.publicUrl, sort_order: i, is_primary: i === 0 })
  }
  if (records.length > 0) {
    const { error } = await supabase.from('product_images').insert(records)
    if (error) throw error
  }
}
