'use client'

import { useState } from 'react'
import { Button, Badge } from '@novagross/ui'
import { formatPrice, calculateDiscount } from '@novagross/utils'
import { Heart, Share2 } from 'lucide-react'
import { AddToCartButton } from './add-to-cart-button'

interface Variant {
  id: string
  name: string
  price: number
  comparePrice: number | null
  stock: number
  imageUrl: string | null
  sku: string | null
}

interface ProductVariantSelectorProps {
  product: {
    id: string
    name: string
    price: number
    comparePrice: number | null
    stock: number | null
    images: { url: string }[]
  }
  variants: Variant[]
}

export function ProductVariantSelector({ product, variants }: ProductVariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null
  )

  const selectedVariant = variants.find((v) => v.id === selectedVariantId)

  // Use variant price/stock when selected, fallback to product defaults
  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const currentComparePrice = selectedVariant ? selectedVariant.comparePrice : product.comparePrice
  const currentStock = selectedVariant ? selectedVariant.stock : (product.stock ?? 0)
  const discount = calculateDiscount(currentPrice, currentComparePrice || 0)

  return (
    <>
      {/* Price */}
      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
        {currentComparePrice && currentComparePrice > currentPrice && (
          <>
            <span className="text-xl text-muted-foreground line-through">
              {formatPrice(currentComparePrice)}
            </span>
            <Badge variant="destructive">%{discount} İndirim</Badge>
          </>
        )}
      </div>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Seçenek{selectedVariant ? `: ${selectedVariant.name}` : ''}
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedVariantId
              const isOutOfStock = variant.stock <= 0
              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                  disabled={isOutOfStock}
                  className={`px-4 py-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isOutOfStock
                      ? 'border-muted text-muted-foreground opacity-50 cursor-not-allowed line-through'
                      : 'hover:border-primary'
                  }`}
                >
                  {variant.name}
                  {variant.price !== product.price && (
                    <span className="ml-1 text-xs">({formatPrice(variant.price)})</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {currentStock > 0 ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-green-600">Stokta ({currentStock} adet)</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm text-red-600">Stokta yok</span>
          </>
        )}
      </div>

      {/* Add to Cart */}
      <div className="flex gap-4">
        <AddToCartButton
          product={{
            id: product.id,
            name: product.name,
            price: currentPrice,
            stock: currentStock,
            images: product.images.map((img) => ({ url: img.url })),
          }}
          variantId={selectedVariantId || undefined}
        />
        <Button variant="outline" size="icon">
          <Heart className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
}
