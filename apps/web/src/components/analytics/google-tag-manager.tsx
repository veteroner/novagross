'use client'

import Script from 'next/script'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

function GTMPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GTM_ID) return

    // Track page views
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'pageview',
      page: pathname,
      search: searchParams?.toString() || '',
    })
  }, [pathname, searchParams])

  return null
}

export function GoogleTagManager() {
  if (!GTM_ID) {
    return null
  }

  return (
    <>
      {/* Google Tag Manager Script */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {/* Page view tracking wrapped in Suspense */}
      <Suspense fallback={null}>
        <GTMPageView />
      </Suspense>
    </>
  )
}

// Helper function to push events to dataLayer
export function gtmEvent(eventName: string, eventData?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData,
    })
  }
}

// TypeScript declaration
declare global {
  interface Window {
    dataLayer: any[]
  }
}
