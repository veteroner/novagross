'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'

type Props = {
  product: {
    id: string
    name: string
    price: number
    stock: number | null
    image?: string | null
  }
}

export function AddToCartQuickButton({ product }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const outOfStock = product.stock === 0

  const handleAddToCart = async () => {
    if (outOfStock) return

    setIsAdding(true)

    addItem({
      productId: product.id,
      variantId: null,
      quantity: 1,
      price: product.price,
      name: product.name,
      image: product.image ?? null,
    })

    setIsAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Button
      className="w-full mt-4"
      size="sm"
      onClick={handleAddToCart}
      disabled={outOfStock || isAdding}
      variant={added ? 'secondary' : 'default'}
    >
      <ShoppingCart className="h-4 w-4 mr-2" />
      {isAdding ? 'Ekleniyor...' : added ? 'Sepete Eklendi' : 'Sepete Ekle'}
    </Button>
  )
}
