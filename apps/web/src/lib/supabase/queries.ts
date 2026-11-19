import { createClient } from '@/lib/supabase/server'

type CategoryLite = { id: string; name: string; slug: string }

// Kategorileri getir
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }
  return data || []
}

// Tüm ürünleri getir (filtreleme ile)
export async function getProducts(options?: {
  categorySlug?: string
  search?: string
  sortBy?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('approval_status', 'approved')
  
  // Kategori filtresi
  if (options?.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .single()
    
    if (category) {
      query = query.eq('category_id', (category as { id: string }).id)
    }
  }
  
  // Arama
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }
  
  // Sıralama
  switch (options?.sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }
  
  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Error fetching products:', error)
    return { products: [], count: 0 }
  }
  
  return { products: data || [], count: count || 0 }
}

// Tek ürün getir
export async function getProductBySlug(slug: string) {
  const supabase = await createClient()
  
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .single()
  
  if (error) {
    console.error('Error fetching product by slug:', slug, error)
    return null
  }

  if (!product) {
    console.warn('Product not found for slug:', slug)
    return null
  }

  const category = product.category_id
    ? await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('id', product.category_id)
        .single()
    : null

  const store = (product as any).store_id
    ? await supabase
        .from('stores')
        .select('id, store_name, store_slug, status, free_shipping_threshold, company_name, address, city, district, email, phone')
        .eq('id', (product as any).store_id)
        .maybeSingle()
    : null

  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('url, sort_order')
    .eq('product_id', product.id)
    .order('sort_order')

  if (imagesError) {
    console.error('Error fetching product images:', imagesError)
  }

  const variants = await supabase
    .from('product_variants')
    .select('id, name, price, compare_price, stock, image_url, sku')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('created_at')

  const { data: summary } = await (supabase as any).rpc('public_review_summary', { p_product_id: product.id })

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    comparePrice: product.compare_at_price,
    stock: product.stock,
    brand: product.brand,
    rating: Number(summary?.[0]?.average_rating || 0),
    reviewCount: Number(summary?.[0]?.review_count || 0),
    category: category?.data ?? null,
    store: store?.data && store.data.status === 'active'
      ? {
          id: store.data.id,
          name: store.data.store_name,
          companyName: store.data.company_name,
          address: [store.data.address, store.data.district, store.data.city].filter(Boolean).join(', '),
          email: store.data.email,
          phone: store.data.phone,
          slug: store.data.store_slug,
          freeShippingThreshold: store.data.free_shipping_threshold ?? 500,
        }
      : null,
    images: (images ?? []).map((img) => ({
      url: img.url,
      alt: `${product.name}${category?.data?.name ? ` - ${category.data.name}` : ''}`,
    })),
    variants: (variants.data ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      comparePrice: variant.compare_price,
      stock: variant.stock ?? 0,
      imageUrl: variant.image_url,
      sku: variant.sku,
    })),
  }
}

// Kategori detayı getir
export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  
  if (error) {
    console.error('Error fetching category:', error)
    return null
  }
  return data
}
