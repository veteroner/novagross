'use client'

import { useEffect, useRef } from 'react'
import { trackProductEvent } from '@/lib/analytics/track-product-event'

/** Ürün detay sayfası görüntülenme olayı — sayfa başına 1 kez. */
export function ProductViewTracker({ productId }: { productId: string }) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!productId || sent.current === productId) return
    sent.current = productId
    trackProductEvent('view', productId)
  }, [productId])

  return null
}
