/**
 * Conversion Tracking Helper
 * Tracks key conversion events across different platforms (GA4, Facebook Pixel, etc.)
 */

import { gtmEvent } from '@/components/analytics/google-tag-manager'

/**
 * Track successful payment/order completion
 */
export function trackOrderCompleted(orderId: string, revenue: number, paymentMethod: string) {
  // GTM / GA4
  gtmEvent('conversion', {
    send_to: 'AW-CONVERSION_ID/ORDER_CONVERSION_LABEL', // Replace with actual Google Ads conversion ID
    value: revenue,
    currency: 'TRY',
    transaction_id: orderId,
  })

  // Facebook Pixel Purchase event
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value: revenue,
      currency: 'TRY',
      content_type: 'product',
      content_ids: [orderId],
    })
  }

  // Custom event for internal tracking
  gtmEvent('order_completed', {
    order_id: orderId,
    revenue,
    payment_method: paymentMethod,
  })
}

/**
 * Track newsletter subscription
 */
export function trackNewsletterSubscription(email: string, source: string = 'footer') {
  // Facebook Pixel Lead event
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: 'Newsletter Subscription',
      content_category: 'Newsletter',
    })
  }

  // GTM event
  gtmEvent('newsletter_subscription', {
    source,
    email_hash: hashEmail(email), // For privacy, only send hashed email
  })

  // GA4 sign_up event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method: 'newsletter',
    })
  }
}

/**
 * Track contact form submission
 */
export function trackContactFormSubmission(formType: string = 'contact') {
  // Facebook Pixel Contact event
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Contact')
  }

  // GTM event
  gtmEvent('form_submission', {
    form_type: formType,
  })
}

/**
 * Track product added to wishlist
 */
export function trackAddToWishlist(productId: string, productName: string, price: number) {
  // Facebook Pixel AddToWishlist event
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToWishlist', {
      content_ids: [productId],
      content_name: productName,
      value: price,
      currency: 'TRY',
    })
  }

  // GTM event
  gtmEvent('add_to_wishlist', {
    product_id: productId,
    product_name: productName,
    value: price,
  })
}

/**
 * Track user registration
 */
export function trackUserRegistration(method: string = 'email') {
  // Facebook Pixel CompleteRegistration event
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'CompleteRegistration', {
      content_name: 'User Registration',
      status: 'completed',
    })
  }

  // GA4 sign_up event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method,
    })
  }

  // GTM event
  gtmEvent('user_registration', {
    method,
  })
}

/**
 * Simple email hashing for privacy (SHA-256)
 */
async function hashEmail(email: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return ''
  }

  try {
    const msgBuffer = new TextEncoder().encode(email.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch {
    return ''
  }
}

// TypeScript declarations
declare global {
  interface Window {
    fbq?: (command: string, eventName: string, params?: any) => void
    gtag?: (command: string, eventName: string, params?: any) => void
    dataLayer: any[]
  }
}
