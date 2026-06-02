import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Header } from '@/components/layout/header-client'
import { Footer } from '@/components/layout/footer'
import { ProgressBar } from '@/components/layout/progress-bar'
import { CookieConsent } from '@/components/cookie-consent'
import { ToastContainer } from '@/components/ui/toast'
import { SkipToContent } from '@/components/accessibility/skip-to-content'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { getSiteUrlObject } from '@/lib/site-url'

// Optimize font loading with next/font
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

// Lazy load analytics and PWA components (non-critical for initial render)
const GoogleAnalytics = dynamic(() => import('@/components/analytics/google-analytics').then(mod => ({ default: mod.GoogleAnalytics })), { ssr: false })
const GoogleTagManager = dynamic(() => import('@/components/analytics/google-tag-manager').then(mod => ({ default: mod.GoogleTagManager })), { ssr: false })
const FacebookPixel = dynamic(() => import('@/components/analytics/facebook-pixel').then(mod => ({ default: mod.FacebookPixel })), { ssr: false })
const MicrosoftClarity = dynamic(() => import('@/components/analytics/microsoft-clarity').then(mod => ({ default: mod.MicrosoftClarity })), { ssr: false })
const WebVitals = dynamic(() => import('@/components/analytics/web-vitals').then(mod => ({ default: mod.WebVitals })), { ssr: false })
const WebVitalsReporter = dynamic(() => import('@/components/analytics/web-vitals-reporter').then(mod => ({ default: mod.WebVitalsReporter })), { ssr: false })
const PageViewTracker = dynamic(() => import('@/components/analytics/page-view-tracker').then(mod => ({ default: mod.PageViewTracker })), { ssr: false })
const PWAInstallPrompt = dynamic(() => import('@/components/pwa/pwa-install-prompt').then(mod => ({ default: mod.PWAInstallPrompt })), { ssr: false })
const PushNotificationPrompt = dynamic(() => import('@/components/notifications/push-notification-prompt').then(mod => ({ default: mod.PushNotificationPrompt })), { ssr: false })
const PWAInstaller = dynamic(() => import('@/components/pwa/pwa-installer').then(mod => ({ default: mod.PWAInstaller })), { ssr: false })

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  ...genMetadata({
    title: 'Novagross - Online Alışveriş',
    description: 'En kaliteli ürünler, en uygun fiyatlarla Novagross\'da! Elektronik, moda, ev & yaşam ve daha fazlası için güvenli alışveriş deneyimi.',
    keywords: ['online alışveriş', 'e-ticaret', 'elektronik', 'moda', 'ev & yaşam', 'teknoloji', 'kampanya'],
    image: '/og-image.png',
  }),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Novagross',
  },
  other: {
    // Some browsers warn that `apple-mobile-web-app-capable` is deprecated; keep Apple meta via `appleWebApp`
    // but also include the generic capability meta.
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        {/* Resource Hints for Performance */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <ProgressBar />
        <SkipToContent />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </main>
            <Footer />
          </div>
          <CookieConsent />
          <GoogleAnalytics />
          <GoogleTagManager />
          <FacebookPixel />
          <MicrosoftClarity />
          <WebVitalsReporter />
          <WebVitals />
          <PageViewTracker />
          <PWAInstallPrompt />
          <PushNotificationPrompt />
          <PWAInstaller />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
