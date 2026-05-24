'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'
import { reportWebVitals } from '@/lib/analytics/web-vitals'

/**
 * Web Vitals Reporting Component
 * 
 * This component monitors Core Web Vitals and reports them to:
 * - Google Analytics 4 (via gtag)
 * - Google Tag Manager (via dataLayer)
 * - Console (in development)
 * 
 * Metrics tracked:
 * - LCP: Largest Contentful Paint
 * - FID: First Input Delay (deprecated, replaced by INP)
 * - CLS: Cumulative Layout Shift
 * - FCP: First Contentful Paint
 * - TTFB: Time to First Byte
 * - INP: Interaction to Next Paint (new metric replacing FID)
 * 
 * @see https://web.dev/vitals/
 * @see https://github.com/GoogleChrome/web-vitals
 */
export function WebVitalsReporter() {
  useEffect(() => {
    // Track Core Web Vitals
    onCLS(reportWebVitals)  // Cumulative Layout Shift
    onLCP(reportWebVitals)  // Largest Contentful Paint
    
    // Track additional Web Vitals
    onFCP(reportWebVitals)  // First Contentful Paint
    onTTFB(reportWebVitals) // Time to First Byte
    onINP(reportWebVitals)  // Interaction to Next Paint (replacing FID)
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals monitoring started')
    }
  }, [])

  // This component renders nothing
  return null
}
