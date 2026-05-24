'use client'

import { useEffect, useState } from 'react'

export function FacebookPixel() {
  const [hasConsent, setHasConsent] = useState(false)
  const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

  useEffect(() => {
    const checkConsent = () => {
      try {
        const consent = localStorage.getItem('cookie-consent')
        if (consent) {
          const parsed = JSON.parse(consent)
          setHasConsent(parsed.marketing === true)
        }
      } catch (error) {
        console.error('Error reading cookie consent:', error)
      }
    }

    checkConsent()

    const handleConsentChange = () => {
      checkConsent()
    }

    window.addEventListener('storage', handleConsentChange)
    window.addEventListener('cookie-consent-updated', handleConsentChange)

    return () => {
      window.removeEventListener('storage', handleConsentChange)
      window.removeEventListener('cookie-consent-updated', handleConsentChange)
    }
  }, [])

  useEffect(() => {
    if (!hasConsent || !FB_PIXEL_ID) return

    if (typeof window === 'undefined') return
    if (typeof window.fbq === 'function') return

    ;(window as any).fbq = function (...args: any[]) {
      ;(window as any).fbq.queue?.push(args)
    }
    ;(window as any).fbq.queue = []
    ;(window as any).fbq.version = '2.0'
    ;(window as any)._fbq = (window as any).fbq

    const existing = document.getElementById('facebook-pixel-lib')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'facebook-pixel-lib'
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      script.onload = () => {
        try {
          ;(window as any).fbq('init', FB_PIXEL_ID)
          ;(window as any).fbq('track', 'PageView')
        } catch (e) {
          console.error('Facebook Pixel init error:', e)
        }
      }
      document.head.appendChild(script)
    }
  }, [hasConsent, FB_PIXEL_ID])

  if (!hasConsent || !FB_PIXEL_ID) {
    return null
  }

  return (
    <>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
