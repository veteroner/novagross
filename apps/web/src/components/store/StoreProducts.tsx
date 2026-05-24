'use client'

import Link from 'next/link'
import { Card } from '@novagross/ui/card'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number | null
  product_images: Array<{
    id: string
    url: string
    sort_order: number | null
  }>
  categories: {
    name: string
    slug: string
  } | null
}

interface StoreProductsProps {
  products: Product[]
}

export default function StoreProducts({ products }: StoreProductsProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold mb-2">Henüz ürün yok</h3>
        <p className="text-gray-600">
          Bu mağazada henüz ürün bulunmuyor
        </p>
      </div>
    )
  }

  const calculateDiscount = (price: number, comparePrice: number | null) => {
    if (!comparePrice || comparePrice <= price) return null
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        const firstImage = product.product_images?.sort((a, b) => 
          (a.sort_order || 0) - (b.sort_order || 0)
        )[0]
        const discount = calculateDiscount(product.price, product.compare_at_price)

        return (
          <Link key={product.id} href={`/urun/${product.slug}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                {firstImage ? (
                  <img
                    src={firstImage.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    📦
                  </div>
                )}
                {discount && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
                    %{discount} İndirim
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold">
                      Stokta Yok
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">
                  {product.categories?.name}
                </p>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-xl font-bold text-gray-900">
                    ₺{product.price.toLocaleString('tr-TR')}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      ₺{product.compare_at_price.toLocaleString('tr-TR')}
                    </span>
                  )}
                </div>
                {product.stock && product.stock > 0 && product.stock <= 10 && (
                  <p className="text-xs text-orange-600 mt-2">
                    Son {product.stock} ürün!
                  </p>
                )}
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
