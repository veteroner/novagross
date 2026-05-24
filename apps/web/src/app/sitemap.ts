import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'
  const currentDate = new Date()
  const supabase = await createClient()

  // Statik sayfalar
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/urunler`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/kategoriler`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hakkimizda`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/kampanyalar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/yeni-gelenler`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gizlilik-politikasi`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kullanim-kosullari`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kvkk`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/iade-degisim`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/sikca-sorulan-sorular`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/kargo-takip`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // Dinamik ürün sayfaları
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(500) // Limit for performance

  const productPages: MetadataRoute.Sitemap = (products || []).map(
    (product: { slug: string; updated_at: string | null }) => ({
      url: `${baseUrl}/urun/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    })
  )

  // Dinamik kategori sayfaları
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map(
    (category: { slug: string; updated_at: string | null }) => ({
      url: `${baseUrl}/kategori/${category.slug}`,
      lastModified: category.updated_at ? new Date(category.updated_at) : currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.8,
    })
  )

  // Dinamik mağaza sayfaları
  const { data: stores } = await supabase
    .from('stores')
    .select('store_slug, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(200) // Limit for performance

  const storePages: MetadataRoute.Sitemap = (stores || []).map(
    (store: { store_slug: string; updated_at: string | null }) => ({
      url: `${baseUrl}/magaza/${store.store_slug}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
    })
  )

  // Mağaza listesi sayfası
  const storeListPage: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/magaza`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]
  
  return [
    ...staticPages,
    ...categoryPages,
    ...productPages,
    ...storePages,
    ...storeListPage,
  ]
}
