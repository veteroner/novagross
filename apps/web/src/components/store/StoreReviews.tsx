'use client'

import { Card } from '@novagross/ui/card'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  is_verified: boolean | null
  created_at: string | null
  profiles: {
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

interface StoreReviewsProps {
  storeId: string
  reviews: Review[]
  averageRating: number
  totalReviews: number
}

export default function StoreReviews({
  storeId,
  reviews,
  averageRating,
  totalReviews
}: StoreReviewsProps) {
  const getDisplayName = (profile: Review['profiles']) => {
    const first = profile?.first_name?.trim() || ''
    const last = profile?.last_name?.trim() || ''
    const full = `${first} ${last}`.trim()
    return full || 'Anonim Kullanıcı'
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
    return { rating, count, percentage }
  })

  if (reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="text-lg font-semibold mb-2">Henüz değerlendirme yok</h3>
        <p className="text-gray-600">
          Bu mağazayı ilk değerlendiren siz olun
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= Math.round(averageRating)
                      ? 'text-yellow-500'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="text-gray-600">
              {totalReviews} değerlendirme
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center space-x-3">
                <span className="text-sm font-medium w-12">
                  {rating} yıldız
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="p-6">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              {review.profiles?.avatar_url ? (
                <img
                  src={review.profiles.avatar_url}
                  alt={getDisplayName(review.profiles)}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              )}

              {/* Review Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {getDisplayName(review.profiles)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`${
                              star <= review.rating
                                ? 'text-yellow-500'
                                : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {review.is_verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Onaylı Alıcı
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {review.created_at ? new Date(review.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Tarih belirtilmemiş'}
                  </span>
                </div>

                {review.title && (
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {review.title}
                  </h4>
                )}

                {review.comment && (
                  <p className="text-gray-700">{review.comment}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
