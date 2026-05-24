import { Metadata } from 'next'
import { createClient } from '@novagross/database/client'
import { notFound } from 'next/navigation'
import { Card } from '@novagross/ui/card'
import StoreProducts from '@/components/store/StoreProducts'
import StoreFollowButton from '@/components/store/StoreFollowButton'
import StoreReviews from '@/components/store/StoreReviews'

interface StorePageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('store_name, description')
    .eq('store_slug', params.slug)
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
  const supabase = createClient()

  // Get store
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('store_slug', params.slug)
    .eq('status', 'active')
    .single()

  if (!store) notFound()

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
      {/* Banner */}
      <div className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt={store.store_name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
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
            {/* Products */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ürünler ({products?.length || 0})
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
