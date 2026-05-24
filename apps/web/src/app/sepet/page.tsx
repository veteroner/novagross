'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { useCartStore } from '@/stores/cart-store'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { CouponInput } from '@/components/cart/coupon-input'
import { useShippingConfig, calculateShippingCost } from '@/hooks/use-shipping-config'

interface AppliedCoupon {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  discountAmount: number
  freeShipping: boolean
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart, isHydrated } = useCartStore()
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  
  // Dynamic shipping config from store settings
  const shippingConfig = useShippingConfig(items.map(i => i.productId))

  // Show loading until hydration completes
  if (!isHydrated) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sepetiniz Boş</h1>
          <p className="text-muted-foreground mb-6">
            Alışverişe başlamak için ürünleri keşfedin
          </p>
          <Button asChild>
            <Link href="/urunler">
              Alışverişe Başla
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const subtotal = getTotalPrice()
  const discountAmount = appliedCoupon?.discountAmount || 0
  const afterDiscount = subtotal - discountAmount
  const shippingCost = calculateShippingCost(shippingConfig, afterDiscount, 'standard', {
    freeShipping: appliedCoupon?.freeShipping,
  })
  const total = afterDiscount + shippingCost

  const handleCouponApply = (coupon: AppliedCoupon | null) => {
    setAppliedCoupon(coupon)
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Sepetim ({items.length} ürün)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={`${item.productId}-${item.variantId}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-lg font-bold mt-1">{formatPrice(item.price)}</p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-2 hover:bg-muted disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-3 font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="p-2 hover:bg-muted"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Clear Cart Button */}
          <Button variant="outline" onClick={clearCart} className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Sepeti Temizle
          </Button>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              {/* Coupon Input */}
              <CouponInput 
                subtotal={subtotal} 
                onApply={handleCouponApply} 
                appliedCoupon={appliedCoupon} 
              />

              {/* Discount Display */}
              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Kupon İndirimi ({appliedCoupon.code})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              {appliedCoupon?.freeShipping && (
                <div className="flex justify-between text-green-600">
                  <span>Kargo Bedava ({appliedCoupon.code})</span>
                  <span>—</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                {shippingCost === 0 ? (
                  <span className="text-green-600">Ücretsiz</span>
                ) : (
                  <span>{formatPrice(shippingCost)}</span>
                )}
              </div>

              {shippingCost > 0 && shippingConfig.freeShippingThreshold > 0 && (
                <p className="text-xs text-muted-foreground">
                  {shippingConfig.freeShippingThreshold}₺ ve üzeri alışverişlerde kargo ücretsiz!
                </p>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Toplam</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Button asChild className="w-full" size="lg">
                <Link href="/odeme">
                  Ödemeye Geç
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/urunler">Alışverişe Devam Et</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
