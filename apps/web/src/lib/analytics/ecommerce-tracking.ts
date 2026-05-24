/**
 * Google Analytics 4 E-commerce Event Tracking
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

// GTM dataLayer helper (inline)
function gtmEvent(eventName: string, params: Record<string, any>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...params,
    })
  }
}

export interface EcommerceItem {
  item_id: string
  item_name: string
  item_brand?: string
  item_category?: string
  item_variant?: string
  price: number
  quantity: number
  index?: number
}

export interface EcommerceTransaction {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  items: EcommerceItem[]
}

/**
 * Track when user views a product
 */
export function trackViewItem(item: EcommerceItem) {
  gtmEvent('view_item', {
    currency: 'TRY',
    value: item.price,
    items: [item],
  })

  // Also send to GA4 directly if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'TRY',
      value: item.price,
      items: [item],
    })
  }
}

/**
 * Track when user adds item to cart
 */
export function trackAddToCart(item: EcommerceItem) {
  gtmEvent('add_to_cart', {
    currency: 'TRY',
    value: item.price * item.quantity,
    items: [item],
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'TRY',
      value: item.price * item.quantity,
      items: [item],
    })
  }
}

/**
 * Track when user removes item from cart
 */
export function trackRemoveFromCart(item: EcommerceItem) {
  gtmEvent('remove_from_cart', {
    currency: 'TRY',
    value: item.price * item.quantity,
    items: [item],
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'remove_from_cart', {
      currency: 'TRY',
      value: item.price * item.quantity,
      items: [item],
    })
  }
}

/**
 * Track when user views cart
 */
export function trackViewCart(items: EcommerceItem[], totalValue: number) {
  gtmEvent('view_cart', {
    currency: 'TRY',
    value: totalValue,
    items,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_cart', {
      currency: 'TRY',
      value: totalValue,
      items,
    })
  }
}

/**
 * Track when user begins checkout
 */
export function trackBeginCheckout(items: EcommerceItem[], totalValue: number) {
  gtmEvent('begin_checkout', {
    currency: 'TRY',
    value: totalValue,
    items,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'TRY',
      value: totalValue,
      items,
    })
  }
}

/**
 * Track when user adds shipping info
 */
export function trackAddShippingInfo(items: EcommerceItem[], totalValue: number, shippingTier?: string) {
  gtmEvent('add_shipping_info', {
    currency: 'TRY',
    value: totalValue,
    shipping_tier: shippingTier,
    items,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_shipping_info', {
      currency: 'TRY',
      value: totalValue,
      shipping_tier: shippingTier,
      items,
    })
  }
}

/**
 * Track when user adds payment info
 */
export function trackAddPaymentInfo(items: EcommerceItem[], totalValue: number, paymentType?: string) {
  gtmEvent('add_payment_info', {
    currency: 'TRY',
    value: totalValue,
    payment_type: paymentType,
    items,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_payment_info', {
      currency: 'TRY',
      value: totalValue,
      payment_type: paymentType,
      items,
    })
  }
}

/**
 * Track successful purchase
 */
export function trackPurchase(transaction: EcommerceTransaction) {
  gtmEvent('purchase', {
    transaction_id: transaction.transaction_id,
    value: transaction.value,
    currency: transaction.currency,
    tax: transaction.tax,
    shipping: transaction.shipping,
    items: transaction.items,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transaction.transaction_id,
      value: transaction.value,
      currency: transaction.currency,
      tax: transaction.tax,
      shipping: transaction.shipping,
      items: transaction.items,
    })
  }
}

/**
 * Track when user searches
 */
export function trackSearch(searchTerm: string) {
  gtmEvent('search', {
    search_term: searchTerm,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    })
  }
}

/**
 * Track newsletter signup
 */
export function trackNewsletterSignup(method?: string) {
  gtmEvent('newsletter_signup', {
    method: method || 'footer',
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method: method || 'newsletter',
    })
  }
}

// TypeScript declarations
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: any) => void
  }
}
