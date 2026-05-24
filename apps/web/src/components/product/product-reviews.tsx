'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, Input } from '@novagross/ui'
import { Star, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

interface Review {
  id: string
  rating: number
  title: string
  comment: string
  created_at: string
  is_approved: boolean
  profiles: { first_name: string; last_name: string } | null
}

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const { user } = useAuthStore()

  const supabase = createClient()

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        created_at,
        is_approved,
        profiles(first_name, last_name)
      `)
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReviews(data as any)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    
    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        rating,
        title,
        comment,
        is_approved: false // Requires admin approval
      })

    if (!error) {
      setShowForm(false)
      setRating(5)
      setTitle('')
      setComment('')
      alert('Yorumunuz gönderildi. Onaylandıktan sonra yayınlanacaktır.')
    }
    setSubmitting(false)
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Müşteri Yorumları</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {renderStars(Math.round(averageRating))}
              <span className="text-sm text-muted-foreground">
                ({reviews.length} yorum)
              </span>
            </div>
          )}
        </div>
        {user && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            Yorum Yaz
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Puanınız</label>
                {renderStars(rating, true)}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Başlık</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Yorum başlığı"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Yorumunuz</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ürün hakkındaki düşüncelerinizi yazın..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Gönderiliyor...' : 'Gönder'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Henüz yorum yapılmamış.</p>
            {user ? (
              <p className="mt-2">İlk yorumu siz yapın!</p>
            ) : (
              <p className="mt-2">
                Yorum yapmak için{' '}
                <a href="/giris" className="text-primary hover:underline">
                  giriş yapın
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {review.profiles 
                          ? `${review.profiles.first_name || ''} ${review.profiles.last_name || ''}`.trim() || 'Anonim'
                          : 'Anonim'}
                      </p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {review.title && (
                  <h4 className="font-semibold mt-3">{review.title}</h4>
                )}
                <p className="text-muted-foreground mt-2">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!user && reviews.length > 0 && (
        <p className="text-center text-muted-foreground mt-6">
          Yorum yapmak için{' '}
          <a href="/giris" className="text-primary hover:underline">
            giriş yapın
          </a>
        </p>
      )}
    </div>
  )
}
