import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/hesabim/',
          '/sepet',
          '/odeme',
          '/siparis-basarili',
          '/_next/',
          '/favicon.ico',
          '/apple-touch-icon.png',
          '/apple-touch-icon-precomposed.png',
          '/sw.js',
        ],
      },
    ],
    sitemap: 'https://novagross.com/sitemap.xml',
  }
}
