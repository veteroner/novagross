# 📊 Web Vitals Monitoring - Trendikon

## Overview

Trendikon web sitesi, Google'ın önerdiği **Core Web Vitals** ve ek performans metriklerini gerçek zamanlı olarak izler ve raporlar.

## Monitored Metrics

### 🎯 Core Web Vitals (Google Ranking Factors)

| Metric | Description | Good Threshold | Needs Improvement | Poor |
|--------|-------------|----------------|-------------------|------|
| **LCP** | Largest Contentful Paint - Loading performance | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** | First Input Delay - Interactivity (legacy) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** | Cumulative Layout Shift - Visual stability | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP** | Interaction to Next Paint - Responsiveness (NEW) | < 200ms | 200ms - 500ms | > 500ms |

### 📈 Additional Web Vitals

| Metric | Description | Good Threshold |
|--------|-------------|----------------|
| **FCP** | First Contentful Paint - Time to first render | < 1.8s |
| **TTFB** | Time to First Byte - Server response time | < 800ms |

## Implementation

### Files Created

```
apps/web/src/
├── lib/analytics/
│   └── web-vitals.ts                    # Utility functions & GA4 integration
└── components/analytics/
    └── web-vitals-reporter.tsx          # Client component for monitoring
```

### Integration

Web Vitals monitoring is automatically enabled in `layout.tsx`:

```tsx
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* ... */}
        <WebVitalsReporter />
      </body>
    </html>
  )
}
```

## How It Works

### 1. Metric Collection

The `WebVitalsReporter` component uses the `web-vitals` library to automatically capture metrics:

```tsx
import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP } from 'web-vitals'

useEffect(() => {
  onCLS(reportWebVitals)  // Cumulative Layout Shift
  onFID(reportWebVitals)  // First Input Delay
  onLCP(reportWebVitals)  // Largest Contentful Paint
  onFCP(reportWebVitals)  // First Contentful Paint
  onTTFB(reportWebVitals) // Time to First Byte
  onINP(reportWebVitals)  // Interaction to Next Paint
}, [])
```

### 2. Reporting Destinations

Each metric is sent to multiple destinations:

#### a) Google Analytics 4 (GA4)

```javascript
gtag('event', 'LCP', {
  value: 2400,
  event_category: 'Web Vitals',
  event_label: 'v3-1234567890',
  metric_rating: 'good',
  metric_delta: 2400
})
```

#### b) Google Tag Manager (dataLayer)

```javascript
window.dataLayer.push({
  event: 'web_vitals',
  metric_name: 'LCP',
  metric_value: 2400,
  metric_rating: 'good',
  metric_id: 'v3-1234567890',
  metric_delta: 2400
})
```

#### c) Console (Development Only)

```
✅ LCP: 2400 (good) v3-12345
⚠️ CLS: 0.12 (needs-improvement) v4-67890
❌ FID: 350 (poor) v5-11121
```

### 3. Metric Ratings

Each metric is automatically rated based on Google's thresholds:

- ✅ **Good**: Meets recommended threshold
- ⚠️ **Needs Improvement**: Between good and poor
- ❌ **Poor**: Exceeds poor threshold

## Testing & Verification

### 1. Development Mode

```bash
cd apps/web
pnpm dev
```

Open browser console to see real-time Web Vitals:

```
📊 Web Vitals monitoring started
✅ TTFB: 45 (good) v1-abc123
✅ FCP: 1200 (good) v2-def456
✅ LCP: 2300 (good) v3-ghi789
```

### 2. Chrome DevTools

**Performance Tab:**
1. Open DevTools (`F12`)
2. Go to **Performance** tab
3. Record page load
4. Check **Timings** section for:
   - FCP (First Contentful Paint)
   - LCP (Largest Contentful Paint)

**Lighthouse:**
1. Open DevTools (`F12`)
2. Go to **Lighthouse** tab
3. Select **Performance**
4. Click **Analyze page load**
5. View Core Web Vitals section

### 3. Google Analytics 4

**Real-Time Reports:**
1. Go to GA4 dashboard
2. Navigate to **Reports** → **Real-time**
3. Trigger some interactions on the site
4. Check **Events** for `web_vitals` events

**Custom Report:**
1. Go to **Explore** tab
2. Create new exploration
3. Add **Event name** = `LCP`, `FID`, `CLS`, `INP`
4. Add dimensions: `metric_rating`
5. View distribution of good/needs-improvement/poor

### 4. Google Tag Manager

**Preview Mode:**
1. Open GTM container
2. Click **Preview**
3. Enter your site URL
4. Check **dataLayer** for `web_vitals` events:

```javascript
{
  event: 'web_vitals',
  metric_name: 'LCP',
  metric_value: 2400,
  metric_rating: 'good',
  // ...
}
```

## Optimization Tips

### Improving LCP (< 2.5s)

- ✅ Use Next.js Image component with priority
- ✅ Implement lazy loading for below-fold images
- ✅ Optimize image formats (WebP/AVIF)
- ✅ Use CDN for static assets
- ⚠️ Reduce server response time (TTFB)
- ⚠️ Implement ISR (Incremental Static Regeneration)

**Trendikon Status:**
- ✅ Next.js Image component used
- ✅ WebP/AVIF enabled
- ✅ Lazy loading implemented
- ✅ Priority on hero images

### Improving FID/INP (< 100ms / < 200ms)

- ✅ Minimize JavaScript execution time
- ✅ Code splitting and dynamic imports
- ✅ Remove unused dependencies
- ⚠️ Use Web Workers for heavy computations
- ⚠️ Defer non-critical JavaScript

**Trendikon Status:**
- ✅ React Server Components (minimal client JS)
- ✅ Code splitting with Next.js App Router
- ⚠️ Bundle analysis available (`pnpm analyze`)

### Improving CLS (< 0.1)

- ✅ Set explicit width/height on images
- ✅ Reserve space for dynamic content
- ✅ Avoid inserting content above existing content
- ✅ Use CSS containment
- ⚠️ Preload fonts

**Trendikon Status:**
- ✅ Next.js Image with dimensions
- ✅ Skeleton loaders for dynamic content
- ⚠️ Font optimization needed

### Improving TTFB (< 800ms)

- ✅ Use CDN (Vercel Edge Network)
- ✅ Implement caching strategies
- ✅ Optimize database queries
- ⚠️ Use Redis for API caching
- ⚠️ Enable compression (gzip/brotli)

**Trendikon Status:**
- ✅ Deployed on Vercel (Edge)
- ✅ ISR caching (60*60*24)
- ⚠️ Database query optimization
- ⚠️ Redis caching not implemented

## Custom Analytics API (Optional)

To store Web Vitals in your own database, create an API endpoint:

### Create API Route

```typescript
// apps/web/src/app/api/analytics/web-vitals/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json()
    
    // Store in database (Supabase, PostgreSQL, etc.)
    // await db.webVitals.insert({
    //   metric_name: metric.name,
    //   metric_value: metric.value,
    //   metric_rating: metric.rating,
    //   url: metric.url,
    //   timestamp: new Date(),
    // })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Enable in web-vitals.ts

Uncomment the `sendToCustomAnalytics` call:

```typescript
export function reportWebVitals(metric: Metric): void {
  sendToGoogleAnalytics(metric)
  reportWebVitalsToConsole(metric)
  sendToCustomAnalytics(metric) // Uncomment this line
}
```

## Monitoring Dashboard (Future Enhancement)

Create a custom dashboard to visualize Web Vitals over time:

```
/admin/analytics/web-vitals
```

**Features:**
- Real-time metric distribution (good/needs-improvement/poor)
- Historical trends (daily/weekly/monthly)
- Page-by-page breakdown
- Device type comparison (mobile vs desktop)
- Geographic distribution

## Resources

### Documentation
- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals](https://web.dev/vitals/#core-web-vitals)
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Lighthouse Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)

### Tools
- [PageSpeed Insights](https://pagespeed.web.dev/) - Test your live site
- [Chrome User Experience Report](https://developers.google.com/web/tools/chrome-user-experience-report) - Real user data
- [WebPageTest](https://www.webpagetest.org/) - Detailed performance analysis

### Best Practices
- [Optimize LCP](https://web.dev/optimize-lcp/)
- [Optimize FID](https://web.dev/optimize-fid/)
- [Optimize CLS](https://web.dev/optimize-cls/)
- [Optimize INP](https://web.dev/optimize-inp/)

## Troubleshooting

### Metrics Not Showing in GA4

1. **Check GTM/GA4 setup:**
   ```bash
   # Verify GTM container ID in layout.tsx
   GTM-XXXXXXX
   ```

2. **Check browser console:**
   - Should see "📊 Web Vitals monitoring started"
   - Should see metric logs (✅ LCP: 2400...)

3. **Check dataLayer:**
   ```javascript
   console.log(window.dataLayer)
   // Should contain web_vitals events
   ```

### Metrics Showing "Poor" Ratings

1. **Run Lighthouse audit** to identify bottlenecks
2. **Check Network tab** for slow resources
3. **Analyze bundle size** (`pnpm analyze`)
4. **Review server response times** (TTFB)

### INP Not Firing

INP only fires after user interactions. To test:
1. Click buttons
2. Type in inputs
3. Scroll the page
4. Check console for INP metric

---

**Last Updated:** 2024-01-27
**Version:** 1.0
**Package:** web-vitals@5.1.0
