'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    fbq?: (command: string, eventName: string, params?: any) => void
    dataLayer: any[]
  }
}

export function useFacebookPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window.fbq === 'undefined') return

    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '')
    window.fbq('track', 'PageView')
  }, [pathname, searchParams])
}

// E-commerce event helpers
export const fbPixelEvents = {
  viewContent: (productId: string, productName: string, price: number) => {
    if (typeof window.fbq === 'undefined') return
    window.fbq('track', 'ViewContent', {
      content_ids: [productId],
      content_name: productName,
      content_type: 'product',
      value: price,
      currency: 'TRY',
    })
  },

  addToCart: (productId: string, productName: string, price: number, quantity: number = 1) => {
    if (typeof window.fbq === 'undefined') return
    window.fbq('track', 'AddToCart', {
      content_ids: [productId],
      content_name: productName,
      content_type: 'product',
      value: price * quantity,
      currency: 'TRY',
    })
  },

  initiateCheckout: (value: number, numItems: number) => {
    if (typeof window.fbq === 'undefined') return
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency: 'TRY',
      num_items: numItems,
    })
  },

  purchase: (value: number, orderId: string, numItems: number) => {
    if (typeof window.fbq === 'undefined') return
    window.fbq('track', 'Purchase', {
      value,
      currency: 'TRY',
      transaction_id: orderId,
      num_items: numItems,
    })
  },

  search: (searchString: string) => {
    if (typeof window.fbq === 'undefined') return
    window.fbq('track', 'Search', {
      search_string: searchString,
    })
  },
}
