'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button, Card, CardContent } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { useFavoritesStore } from '@/stores/favorites-store'
import { useCartStore } from '@/stores/cart-store'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'

export default function FavoritesPage() {
  const { items, removeFromFavorites, isHydrated } = useFavoritesStore()
  const { addItem } = useCartStore()

  const handleAddToCart = (item: typeof items[0]) => {
    addItem({
      productId: item.productId,
      variantId: null,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image || null,
    })
    removeFromFavorites(item.productId)
  }

  if (!isHydrated) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Favorilerim</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Favori listeniz boş</h2>
            <p className="text-muted-foreground mb-6">
              Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca ulaşabilirsiniz.
            </p>
            <Button asChild>
              <Link href="/urunler">Ürünlere Göz At</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card key={item.productId} className="group relative">
              <button
                onClick={() => removeFromFavorites(item.productId)}
                className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>

              <Link href={`/urun/${item.slug}`}>
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                </div>
              </Link>

              <CardContent className="p-4">
                <Link href={`/urun/${item.slug}`}>
                  <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                </Link>
                <p className="text-lg font-bold mt-2">{formatPrice(item.price)}</p>

                <Button
                  className="w-full mt-4"
                  onClick={() => handleAddToCart(item)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sepete Ekle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
