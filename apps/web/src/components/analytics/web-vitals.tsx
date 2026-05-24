'use client'

import { useReportWebVitals } from 'next/web-vitals'
import * as Sentry from '@sentry/nextjs'

/**
 * Web Vitals Performance Monitoring Component
 * Tracks Core Web Vitals and reports them to Sentry for performance monitoring
 * 
 * Metrics tracked:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - LCP (Largest Contentful Paint)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id
      })
    }

    const unit = getMetricUnit(metric.name)

    // Send to Sentry for performance monitoring
    // (Some SDK versions don't support metric tags in MetricOptions types.)
    try {
      Sentry.metrics.distribution(`web_vitals.${metric.name}`, metric.value, {
        unit,
      } as any)
    } catch {
      // No-op: metrics may be disabled in some environments
    }

    // Also capture an event with rating as a tag for filtering
    Sentry.withScope((scope) => {
      scope.setTag('web_vital', metric.name)
      scope.setTag('web_vital_rating', metric.rating)
      scope.setContext('web_vitals', {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
      })

      Sentry.captureMessage('Web Vitals', 'info')
    })

    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true
      })
    }
  })

  return null
}

/**
 * Get the appropriate unit for each metric
 */
function getMetricUnit(metricName: string): string {
  switch (metricName) {
    case 'CLS':
      return 'none' // CLS is unitless
    case 'FID':
    case 'LCP':
    case 'FCP':
    case 'TTFB':
      return 'millisecond'
    default:
      return 'millisecond'
  }
}

/**
 * Helper function to determine if a metric value is good, needs improvement, or poor
 * Based on Google's Core Web Vitals thresholds
 */
export function getMetricRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (metricName) {
    case 'CLS':
      if (value <= 0.1) return 'good'
      if (value <= 0.25) return 'needs-improvement'
      return 'poor'
    
    case 'FID':
      if (value <= 100) return 'good'
      if (value <= 300) return 'needs-improvement'
      return 'poor'
    
    case 'LCP':
      if (value <= 2500) return 'good'
      if (value <= 4000) return 'needs-improvement'
      return 'poor'
    
    case 'FCP':
      if (value <= 1800) return 'good'
      if (value <= 3000) return 'needs-improvement'
      return 'poor'
    
    case 'TTFB':
      if (value <= 800) return 'good'
      if (value <= 1800) return 'needs-improvement'
      return 'poor'
    
    default:
      return 'needs-improvement'
  }
}
