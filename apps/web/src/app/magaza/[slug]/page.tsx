import { Metadata } from 'next'
import { createClient } from '@novagross/database/client'
import { notFound } from 'next/navigation'
import { Card } from '@novagross/ui/card'
import { safeExternalUrl } from '@novagross/utils'
import StoreProducts from '@/components/store/StoreProducts'
import StoreFollowButton from '@/components/store/StoreFollowButton'
import StoreReviews from '@/components/store/StoreReviews'

interface StorePageProps {
  params: Promise<{ slug: string }> | { slug: string }
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await (params as any)
  const supabase = createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('store_name, description')
    .eq('store_slug', slug)
    .single()

  if (!store) {
    return {
      title: 'Mağaza Bulunamadı',
    }
  }

  return {
    title: `${store.store_name} | Novagross`,
    description: store.description || `${store.store_name} mağazası`,
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await (params as any)
  const supabase = createClient()

  // Get store
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', slug)
    .eq('status', 'active')
    .single()

  if (!store) notFound()

  // Get storefront (public — RLS gates to is_published=true)
  const { data: storefront } = await (supabase as any)
    .from('store_storefront')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_published', true)
    .maybeSingle()

  // Get products
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_images (
        id,
        url,
        sort_order
      ),
      categories (
        name,
        slug
      )
    `)
    .eq('store_id', store.id)
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Get reviews
  const { data: reviews } = await supabase
    .from('store_reviews')
    .select(`
      *,
      profiles:user_id (
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('store_id', store.id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get follower count
  const { count: followerCount } = await supabase
    .from('store_followers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.id)

  // Check if current user follows this store
  const { data: { user } } = await supabase.auth.getUser()
  let isFollowing = false
  if (user) {
    const { data: follow } = await supabase
      .from('store_followers')
      .select('id')
      .eq('store_id', store.id)
      .eq('user_id', user.id)
      .single()
    isFollowing = !!follow
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner — storefront varsa onu kullan */}
      <div
        className="h-64 relative"
        style={
          storefront?.theme_color
            ? {
                background: `linear-gradient(135deg, ${storefront.theme_color} 0%, #1F2937 100%)`,
              }
            : {
                background:
                  'linear-gradient(to right, #3B82F6, #9333EA)',
              }
        }
      >
        {(storefront?.banner_url || store.banner_url) && (() => {
          const safeBannerHref =
            safeExternalUrl(storefront?.banner_link) || `/magaza/${slug}`
          const safeBannerSrc =
            safeExternalUrl(storefront?.banner_url || store.banner_url)
          return safeBannerSrc ? (
            <a href={safeBannerHref} className="block w-full h-full" rel="noopener noreferrer">
              <img
                src={safeBannerSrc}
                alt={storefront?.hero_title || store.store_name}
                className="w-full h-full object-cover"
              />
            </a>
          ) : null
        })()}
        <div className="absolute inset-0 bg-black bg-opacity-20" />

        {/* Hero text overlay */}
        {(storefront?.hero_title || storefront?.hero_subtitle) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
            {storefront.hero_title && (
              <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
                {storefront.hero_title}
              </h1>
            )}
            {storefront.hero_subtitle && (
              <p className="text-base md:text-lg mt-2 drop-shadow-md">
                {storefront.hero_subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Store Header */}
        <div className="relative -mt-32 mb-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              {/* Logo */}
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  className="w-32 h-32 rounded-lg object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-5xl font-bold">
                    {store.store_name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                      {store.store_name}
                    </h1>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500 text-lg">⭐</span>
                        <span className="font-semibold text-lg">
                          {store.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-gray-500">
                          ({store.total_reviews || 0} değerlendirme)
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                          store.verification_badge === 'platinum'
                            ? 'bg-purple-600'
                            : store.verification_badge === 'gold'
                            ? 'bg-yellow-500'
                            : store.verification_badge === 'silver'
                            ? 'bg-gray-400'
                            : 'bg-orange-500'
                        }`}
                      >
                        {store.verification_badge?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <StoreFollowButton
                    storeId={store.id}
                    initialIsFollowing={isFollowing}
                    initialFollowerCount={followerCount || 0}
                  />
                </div>
                <p className="text-gray-600 mb-4">{store.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span>📍</span>
                    <span>{store.city || 'Türkiye'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📦</span>
                    <span>{store.total_sales || 0} satış</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>👥</span>
                    <span>{followerCount || 0} takipçi</span>
                  </div>
                  {store.email && (
                    <div className="flex items-center space-x-2">
                      <span>✉️</span>
                      <a href={`mailto:${store.email}`} className="text-blue-600 hover:underline">
                        {store.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-8 pb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Storefront "about" */}
            {storefront?.about && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Mağaza Hakkında
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{storefront.about}</p>
              </Card>
            )}

            {/* Featured products from storefront */}
            {storefront?.featured_product_ids?.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  ⭐ Öne Çıkan Ürünler
                </h2>
                <StoreProducts
                  products={(products ?? []).filter((p: any) =>
                    storefront.featured_product_ids.includes(p.id)
                  )}
                />
              </div>
            )}

            {/* Products */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Tüm Ürünler ({products?.length || 0})
              </h2>
              <StoreProducts products={products || []} />
            </div>

            {/* Reviews */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Değerlendirmeler
              </h2>
              <StoreReviews
                storeId={store.id}
                reviews={reviews || []}
                averageRating={store.rating || 0}
                totalReviews={store.total_reviews || 0}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Store Info */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Mağaza Bilgileri</h3>
              <div className="space-y-3 text-sm">
                {store.company_name && (
                  <div>
                    <p className="text-gray-500">Şirket</p>
                    <p className="font-medium">{store.company_name}</p>
                  </div>
                )}
                {store.address && (
                  <div>
                    <p className="text-gray-500">Adres</p>
                    <p className="font-medium">
                      {store.address}
                      <br />
                      {store.district && `${store.district}, `}
                      {store.city}
                    </p>
                  </div>
                )}
                {store.phone && (
                  <div>
                    <p className="text-gray-500">Telefon</p>
                    <p className="font-medium">{store.phone}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Shipping Methods */}
            {store.shipping_methods && Array.isArray(store.shipping_methods) && store.shipping_methods.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Kargo Seçenekleri</h3>
                <div className="space-y-2">
                  {store.shipping_methods.map((method: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{method.name || method.provider}</span>
                      <span className="font-medium">
                        {method.price === 0 ? 'Ücretsiz' : `₺${method.price}`}
                      </span>
                    </div>
                  ))}
                </div>
                {store.free_shipping_threshold && store.free_shipping_threshold > 0 && (
                  <p className="text-xs text-gray-600 mt-3 pt-3 border-t">
                    ₺{store.free_shipping_threshold} ve üzeri alışverişlerde ücretsiz kargo
                  </p>
                )}
              </Card>
            )}

            {/* Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">İstatistikler</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Ürün</span>
                  <span className="font-semibold">{products?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Satış</span>
                  <span className="font-semibold">{store.total_sales || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Üyelik Tarihi</span>
                  <span className="font-semibold">
                    {store.created_at ? new Date(store.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'short'
                    }) : 'Belirtilmemiş'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
