import type { ProductCardData } from '@/components/product/product-card'

type RawProduct = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number | null
  brand?: string | null
  category_id?: string | null
  store_id?: string | null
  created_at?: string | null
  product_images?: Array<{
    url: string
    sort_order?: number | null
    is_primary?: boolean | null
  }> | null
}

type Supabase = any

function pickPrimaryImage(images: RawProduct['product_images']): string | null {
  const arr = (images ?? []).filter((i) => Boolean(i?.url))
  if (arr.length === 0) return null
  const primary = arr.find((i) => i?.is_primary)
  if (primary?.url) return primary.url
  const sorted = arr.slice().sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
  return sorted[0]?.url ?? null
}

/**
 * Enrich a list of raw products with the badge metadata needed by ProductCard:
 *  - bestseller_rank (popular_products view)
 *  - verified_seller (stores.status='active')
 *  - coupon_amount / coupon_percent (best matching active store_campaign)
 *  - cart_special if a coupon would actually reduce the price
 *  - category_name + image_url for display
 */
export async function enrichProducts(
  supabase: Supabase,
  products: RawProduct[],
  searchQuery?: string
): Promise<ProductCardData[]> {
  if (products.length === 0) return []

  const productIds = products.map((p) => p.id)
  const storeIds = Array.from(
    new Set(products.map((p) => p.store_id).filter(Boolean))
  ) as string[]
  const categoryIds = Array.from(
    new Set(products.map((p) => p.category_id).filter(Boolean))
  ) as string[]

  const [popularRes, storesRes, campaignsRes, categoriesRes, freeShipRes, adsRes] =
    await Promise.all([
      supabase
        .from('popular_products')
        .select('product_id, rank')
        .in('product_id', productIds),
      storeIds.length > 0
        ? supabase.from('stores').select('id, status').in('id', storeIds)
        : Promise.resolve({ data: [] }),
      storeIds.length > 0
        ? (supabase as any)
            .from('store_campaigns')
            .select(
              'id, store_id, discount_type, discount_value, target_type, product_ids, category_ids, min_order_amount, starts_at, ends_at, is_active'
            )
            .in('store_id', storeIds)
            .eq('is_active', true)
        : Promise.resolve({ data: [] }),
      categoryIds.length > 0
        ? supabase.from('categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [] }),
      // SECURITY: Anon SELECT coupons engellendi (kupon kodu enumeration).
      // Yerine has_free_shipping_coupon RPC ile sadece varlık bilgisi alıyoruz.
      (supabase as any).rpc('has_free_shipping_coupon'),
      // Aktif sponsorlu reklamlar (sadece bu liste için)
      (supabase as any)
        .from('ad_campaigns')
        .select('id, product_ids, ad_type, status, is_active, starts_at, ends_at, keywords')
        .eq('status', 'approved')
        .eq('is_active', true)
        .in('ad_type', ['sponsored_product', 'sponsored_brand']),
    ])

  const rankById = new Map<string, number>()
  for (const row of (popularRes.data ?? []) as any[]) {
    rankById.set(row.product_id, Number(row.rank))
  }

  const verifiedStoreIds = new Set<string>()
  for (const s of (storesRes.data ?? []) as any[]) {
    if (s.status === 'active') verifiedStoreIds.add(s.id)
  }

  const categoryNameById = new Map<string, string>()
  for (const c of (categoriesRes.data ?? []) as any[]) {
    categoryNameById.set(c.id, c.name)
  }

  const now = Date.now()

  // RPC döner: bool (server-side hesaplandı). Sayıdan veriden bağımsız.
  const hasFreeShipping = Boolean((freeShipRes as any)?.data ?? false)

  const activeCampaigns = ((campaignsRes.data ?? []) as any[]).filter((c) => {
    if (c.is_active === false) return false
    if (c.starts_at && new Date(c.starts_at).getTime() > now) return false
    if (c.ends_at && new Date(c.ends_at).getTime() <= now) return false
    return true
  })

  // Sponsorlu reklamı olan ürünleri map'le + keyword matching
  const sponsoredByProduct = new Map<string, string>()
  const queryTerms = searchQuery
    ? searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
    : []

  for (const ad of ((adsRes.data ?? []) as any[])) {
    if (ad.starts_at && new Date(ad.starts_at).getTime() > now) continue
    if (ad.ends_at && new Date(ad.ends_at).getTime() <= now) continue

    // Keyword match: arama sorgusu kampanya keyword'leriyle örtüşüyorsa da sponsored say
    const adKeywords: string[] = Array.isArray(ad.keywords)
      ? (ad.keywords as string[]).map((k: string) => k.toLowerCase())
      : []
    const keywordMatch =
      queryTerms.length > 0 &&
      adKeywords.length > 0 &&
      queryTerms.some((term) => adKeywords.some((kw) => kw.includes(term) || term.includes(kw)))

    if (Array.isArray(ad.product_ids)) {
      for (const pid of ad.product_ids) {
        if (productIds.includes(pid)) {
          // Keyword match olan kampanya daha güçlü — üzerine yazma
          if (keywordMatch || !sponsoredByProduct.has(pid)) {
            sponsoredByProduct.set(pid, ad.id)
          }
        }
      }
    }
  }

  const applicableCampaigns = (product: RawProduct) =>
    activeCampaigns.filter((c) => {
      if (c.store_id !== product.store_id) return false
      if (c.target_type === 'all_products') return true
      if (c.target_type === 'specific_products') {
        return Array.isArray(c.product_ids) && c.product_ids.includes(product.id)
      }
      if (c.target_type === 'category') {
        return (
          Array.isArray(c.category_ids) &&
          product.category_id &&
          c.category_ids.includes(product.category_id)
        )
      }
      return false
    })

  return products.map<ProductCardData>((p) => {
    const matches = applicableCampaigns(p)

    let coupon_amount: number | null = null
    let coupon_percent: number | null = null
    let cart_special = false

    if (matches.length > 0) {
      // Pick the campaign giving the largest immediate discount on this product's price.
      let best: {
        amount: number | null
        percent: number | null
        value: number
      } = { amount: null, percent: null, value: 0 }
      for (const c of matches) {
        if (c.discount_type === 'fixed' && c.discount_value) {
          const v = Number(c.discount_value)
          if (v > best.value) best = { amount: v, percent: null, value: v }
        } else if (c.discount_type === 'percentage' && c.discount_value) {
          const v = (Number(c.discount_value) / 100) * Number(p.price)
          if (v > best.value)
            best = { amount: null, percent: Number(c.discount_value), value: v }
        }
        // BOGO is product-quantity based, doesn't translate to a single-card amount.
      }
      if (best.value > 0) {
        coupon_amount = best.amount
        coupon_percent = best.percent
        cart_special = true
      }
    }

    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    const isNew = p.created_at
      ? Date.now() - new Date(p.created_at).getTime() < fourteenDays
      : false

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      compare_at_price:
        p.compare_at_price != null ? Number(p.compare_at_price) : null,
      stock: p.stock,
      brand: p.brand ?? null,
      category_name: p.category_id ? categoryNameById.get(p.category_id) ?? null : null,
      image_url: pickPrimaryImage(p.product_images),
      bestseller_rank: rankById.get(p.id) ?? null,
      verified_seller: p.store_id ? verifiedStoreIds.has(p.store_id) : false,
      coupon_amount,
      coupon_percent,
      cart_special,
      is_new: isNew,
      free_shipping: hasFreeShipping,
      is_sponsored: sponsoredByProduct.has(p.id),
      ad_campaign_id: sponsoredByProduct.get(p.id) ?? null,
    }
  })
}
