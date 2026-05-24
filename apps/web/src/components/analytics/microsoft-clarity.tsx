'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

export function MicrosoftClarity() {
  const [hasConsent, setHasConsent] = useState(false)
  const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

  useEffect(() => {
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

  if (!hasConsent || !CLARITY_ID) {
    return null
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  )
}
