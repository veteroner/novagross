'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { toast } from '@/components/ui/toast'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images?: { url: string }[]
}

interface AddToCartButtonProps {
  product: Product
  variantId?: string
}

export function AddToCartButton({ product, variantId }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = async () => {
    setIsAdding(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    addItem({
      productId: product.id,
      variantId: variantId || null,
      quantity,
      price: product.price,
      name: product.name,
      image: product.images?.[0]?.url || null,
    })

    setIsAdding(false)
    setAdded(true)
    
    // Show success toast
    toast.success(`${product.name} sepete eklendi!`)

    // Reset "added" state after 2 seconds
    setTimeout(() => setAdded(false), 2000)
  }

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1)
  }

  const increaseQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1)
  }

  return (
    <div className="flex-1 flex gap-4">
      {/* Quantity Selector */}
      <div className="flex items-center border rounded-md">
        <button
          onClick={decreaseQuantity}
          disabled={quantity <= 1}
          className="p-3 hover:bg-muted disabled:opacity-50"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="px-4 font-medium min-w-[3rem] text-center">
          {quantity}
        </span>
        <button
          onClick={increaseQuantity}
          disabled={quantity >= product.stock}
          className="p-3 hover:bg-muted disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={product.stock === 0 || isAdding}
        className="flex-1"
        variant={added ? 'secondary' : 'default'}
      >
        {isAdding ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Ekleniyor...
          </>
        ) : added ? (
          <>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Sepete Eklendi
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sepete Ekle
          </>
        )}
      </Button>
    </div>
  )
}
