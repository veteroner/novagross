import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, Button } from '@novagross/ui'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@novagross/utils'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/giris')
  }

  // Kullanıcının favori ürünlerini çek
  const { data: favorites = [] } = await supabase
    .from('wishlists')
    .select(`
      id,
      product_id,
      products (
        id,
        name,
        slug,
        price,
        compare_at_price,
        product_images (
          url,
          alt_text,
          is_primary,
          sort_order
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Favorilerim</h1>
        <p className="text-muted-foreground">{favorites?.length || 0} ürün</p>
      </div>

      {!favorites || favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Henüz favori ürününüz bulunmuyor.</p>
            <Button asChild>
              <Link href="/kategoriler">Ürünleri Keşfet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((favorite: any) => {
            const product = favorite.products
            const image = product?.product_images?.[0]
            
            return (
              <Card key={favorite.id}>
                <CardContent className="p-4">
                  <Link href={`/urun/${product?.slug}`} className="block mb-3">
                    <div className="aspect-square relative bg-muted rounded-lg overflow-hidden mb-3">
                      {image?.url && (
                        <Image
                          src={image.url}
                          alt={image.alt_text || product?.name || ''}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <h3 className="font-medium line-clamp-2 mb-2">{product?.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{formatPrice(product?.price || 0)}</span>
                      {product?.compare_at_price && product.compare_at_price > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Sepete Ekle
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
