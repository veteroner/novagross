const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // iyzipay reads JSON resources from its package folder at runtime.
  // When bundled into .next/server, those files can be missing.
  // Keeping it external makes Node resolve it from node_modules.
  experimental: {
    serverComponentsExternalPackages: ['iyzipay'],
    instrumentationHook: true,
  },
  staticPageGenerationTimeout: 180, // 3 dakika (varsayılan 60 saniye)
  transpilePackages: ['@novagross/ui', '@novagross/utils', '@novagross/database'],
  
  // Webpack Optimizations
  webpack: (config, { isServer }) => {
    // Bundle Analyzer (only in ANALYZE mode)
    if (process.env.ANALYZE === 'true' && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../analyze/client.html',
          openAnalyzer: true,
        })
      )
    }

    // NOTE: Do not override Next.js' default splitChunks.
    // A previous override caused CSS assets to appear in build-manifest `rootMainFiles`,
    // which made Next emit them as <script src="/_next/static/css/*.css"> and crash on load.

    return config
  },

  // SEO: www.novagross.com → novagross.com 301 redirect (canonical)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.novagross.com' }],
        destination: 'https://novagross.com/:path*',
        permanent: true,
      },
    ]
  },

  // Security Headers
  async headers() {
    return [
      {
        // X-Robots-Tag: noindex for non-page assets to prevent Google from trying to index them
        source: '/favicon.ico',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
      {
        source: '/apple-touch-icon:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://connect.facebook.net https://*.iyzipay.com https://static.hotjar.com https://*.hotjar.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob: https://www.facebook.com",
              "font-src 'self' data: https://cdn.iyzipay.com https://*.iyzipay.com",
              "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.facebook.com https://*.iyzipay.com https://*.sentry.io https://*.hotjar.com https://*.hotjar.io https://api.bigdatacloud.net https://nominatim.openstreetmap.org",
              "frame-src 'self' https://www.youtube.com https://*.iyzipay.com https://*.bkm.com.tr",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://novagross.com https://www.novagross.com https://*.iyzipay.com https://*.bkm.com.tr https:",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
