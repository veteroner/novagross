'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

export function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false)
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    // Check cookie consent from localStorage
    const checkConsent = () => {
      try {
        const consent = localStorage.getItem('cookie-consent')
        if (consent) {
          const parsed = JSON.parse(consent)
          setHasConsent(parsed.analytics === true)
        }
      } catch (error) {
        console.error('Error reading cookie consent:', error)
      }
    }

    checkConsent()

    // Listen for consent changes
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

  // Only render if we have consent and GA ID is configured
  if (!hasConsent || !GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              cookie_flags: 'SameSite=None;Secure'
            });
          `,
        }}
      />
    </>
  )
}
