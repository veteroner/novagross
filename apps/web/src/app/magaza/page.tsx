import { Metadata } from 'next'
import { createClient } from '@novagross/database/client'
import { Card } from '@novagross/ui/card'
import Link from 'next/link'
import { StoreFilters } from '@/components/store/StoreFilters'

export const metadata: Metadata = {
  title: 'Mağazalar | Novagross',
  description: 'Tüm satıcı mağazalarını keşfedin',
}

export default async function StoresPage({
  searchParams,
}: {
  searchParams: { sort?: string; badge?: string }
}) {
  const supabase = createClient()

  // Build query
  let query = supabase
    .from('stores')
    .select(`
      *,
      profiles:owner_id (
        full_name,
        avatar_url
      )
    `)
    .eq('status', 'active')

  // Filter by badge
  if (searchParams.badge && searchParams.badge !== 'all') {
    query = query.eq('verification_badge', searchParams.badge)
  }

  // Sort
  switch (searchParams.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'rating':
      query = query.order('rating', { ascending: false })
      break
    case 'sales':
      query = query.order('total_sales', { ascending: false })
      break
    default:
      query = query.order('rating', { ascending: false })
  }

  const { data: stores } = await query

  // Get stats
  const { count: totalStores } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Satıcı Mağazaları
          </h1>
          <p className="text-gray-600">
            {totalStores} aktif mağazayı keşfedin
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <StoreFilters sort={searchParams.sort} badge={searchParams.badge} />
        </div>

        {/* Store Grid */}
        {!stores || stores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold mb-2">Mağaza bulunamadı</h3>
            <p className="text-gray-600">
              Filtreleri değiştirerek tekrar deneyin
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store: any) => (
              <Link key={store.id} href={`/magaza/${store.store_slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                    {store.banner_url && (
                      <img
                        src={store.banner_url}
                        alt={store.store_name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Badge */}
                    <div className="absolute top-2 right-2">
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

                  {/* Content */}
                  <div className="p-6">
                    {/* Logo & Name */}
                    <div className="flex items-start space-x-4 mb-4">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.store_name}
                          className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-md -mt-8"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md -mt-8">
                          <span className="text-white text-2xl font-bold">
                            {store.store_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 mt-2">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {store.store_name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-semibold">
                            {store.rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-gray-500 text-sm">
                            ({store.total_reviews || 0})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {store.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">Toplam Satış</p>
                        <p className="font-semibold text-gray-900">
                          {store.total_sales || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Konum</p>
                        <p className="font-semibold text-gray-900">
                          {store.city || 'Türkiye'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Siz de Satıcı Olmak İster misiniz?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Novagross'da mağaza açarak geniş müşteri kitlesine ulaşın.
            Hemen başvurun, onay aldıktan sonra satışa başlayın!
          </p>
          <Link
            href="/satici-ol"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Satıcı Başvurusu Yap →
          </Link>
        </div>
      </div>
    </div>
  )
}
