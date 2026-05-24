import { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'

interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article'
  noIndex?: boolean
}

const SITE_NAME = 'Novagross'
const SITE_URL = getSiteUrl()
const DEFAULT_IMAGE = '/og-image.png'

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = DEFAULT_IMAGE,
    url = SITE_URL,
    type = 'website',
    noIndex = false,
  } = config

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`
  const canonicalUrl = url.startsWith('http') ? url : `${SITE_URL}${url}`

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'tr_TR',
      type,
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: '@novagross',
      site: '@novagross',
    },

    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
    },

    // Robots
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },

    // Other Meta
    category: 'E-commerce',
  }

  return metadata
}

// Product specific metadata
export function generateProductMetadata({
  name,
  description,
  price,
  image,
  inStock = true,
  category,
}: {
  name: string
  description: string
  price: number
  image: string
  inStock?: boolean
  category?: string
}): Metadata {
  return generateMetadata({
    title: name,
    description,
    image,
    type: 'website',
    keywords: category ? [category, 'online alışveriş', 'e-ticaret', name] : undefined,
  })
}
