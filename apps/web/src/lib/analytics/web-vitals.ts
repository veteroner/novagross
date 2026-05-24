/**
 * Web Vitals Monitoring & Reporting
 * 
 * Core Web Vitals (Google's recommended metrics):
 * - LCP (Largest Contentful Paint): Loading performance (Good: <2.5s)
 * - FID (First Input Delay): Interactivity (Good: <100ms)
 * - CLS (Cumulative Layout Shift): Visual stability (Good: <0.1)
 * 
 * Additional Web Vitals:
 * - FCP (First Contentful Paint): First render (Good: <1.8s)
 * - TTFB (Time to First Byte): Server response time (Good: <800ms)
 * - INP (Interaction to Next Paint): Responsiveness (Good: <200ms)
 */

import type { Metric } from 'web-vitals'

/**
 * Report Web Vitals metric to Google Analytics 4
 */
export function sendToGoogleAnalytics(metric: Metric): void {
  // Check if gtag is available (GTM/GA4)
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = window.gtag as (...args: unknown[]) => void
    
    // Send to GA4 as event
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
      // Rating: 'good', 'needs-improvement', or 'poor'
      metric_rating: metric.rating,
      // Delta value for metrics that can change (CLS, FCP, LCP)
      metric_delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    })
  }

  // Also send to GTM dataLayer for flexibility
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'web_vitals',
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_id: metric.id,
      metric_delta: metric.delta,
    })
  }
}

/**
 * Report Web Vitals to console in development
 */
export function reportWebVitalsToConsole(metric: Metric): void {
  if (process.env.NODE_ENV === 'development') {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
    const value = metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value)
    
    console.log(
      `${emoji} ${metric.name}:`,
      value,
      `(${metric.rating})`,
      metric.id.substring(0, 8)
    )
  }
}

/**
 * Get thresholds for a given metric
 */
export function getMetricThresholds(metricName: string): { good: number; needsImprovement: number } {
  const thresholds: Record<string, { good: number; needsImprovement: number }> = {
    LCP: { good: 2500, needsImprovement: 4000 },
    FID: { good: 100, needsImprovement: 300 },
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FCP: { good: 1800, needsImprovement: 3000 },
    TTFB: { good: 800, needsImprovement: 1800 },
    INP: { good: 200, needsImprovement: 500 },
  }
  
  return thresholds[metricName] || { good: 0, needsImprovement: 0 }
}

/**
 * Format metric value for display
 */
export function formatMetricValue(metric: Metric): string {
  if (metric.name === 'CLS') {
    return metric.value.toFixed(3)
  }
  return `${Math.round(metric.value)}ms`
}

/**
 * Get metric description
 */
export function getMetricDescription(metricName: string): string {
  const descriptions: Record<string, string> = {
    LCP: 'Largest Contentful Paint - Measures loading performance',
    FID: 'First Input Delay - Measures interactivity',
    CLS: 'Cumulative Layout Shift - Measures visual stability',
    FCP: 'First Contentful Paint - Measures time to first render',
    TTFB: 'Time to First Byte - Measures server response time',
    INP: 'Interaction to Next Paint - Measures responsiveness',
  }
  
  return descriptions[metricName] || 'Unknown metric'
}

/**
 * Main function to report all Web Vitals
 */
export function reportWebVitals(metric: Metric): void {
  // Send to Google Analytics
  sendToGoogleAnalytics(metric)
  
  // Log to console in development
  reportWebVitalsToConsole(metric)
  
  // Custom analytics endpoint (if needed)
  // sendToCustomAnalytics(metric)
}

/**
 * Optional: Send to custom analytics endpoint
 */
export async function sendToCustomAnalytics(metric: Metric): Promise<void> {
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    })

    // Send to custom API endpoint (if implemented)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body)
    } else {
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }
  } catch (error) {
    // Fail silently in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending Web Vitals to custom analytics:', error)
    }
  }
}

/**
 * Helper to check if metric is within good threshold
 */
export function isGoodMetric(metric: Metric): boolean {
  return metric.rating === 'good'
}

/**
 * Helper to check if metric needs improvement
 */
export function needsImprovementMetric(metric: Metric): boolean {
  return metric.rating === 'needs-improvement'
}

/**
 * Helper to check if metric is poor
 */
export function isPoorMetric(metric: Metric): boolean {
  return metric.rating === 'poor'
}

/**
 * TypeScript type augmentation for gtag
 */
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: any) => void
    dataLayer: any[]
  }
}
