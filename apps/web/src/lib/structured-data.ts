import { Organization, WebSite, WebPage, Product, BreadcrumbList, Review, LocalBusiness, WithContext } from 'schema-dts'

/**
 * Organization Schema for the company
 * Should be included on the homepage and contact page
 */
export function generateOrganizationSchema(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Novagross',
    alternateName: 'Novagross E-Ticaret',
    url: 'https://novagross.com',
    logo: 'https://novagross.com/logo.png',
    description: 'Novagross - Türkiye\'nin önde gelen e-ticaret platformu. Elektronik, moda, kozmetik ve daha fazlası.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-850-850-20-20',
      contactType: 'customer service',
      areaServed: 'TR',
      availableLanguage: ['Turkish']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23',
      addressLocality: 'Sıncan',
      addressRegion: 'Ankara',
      postalCode: '06000',
      addressCountry: 'TR'
    },
    sameAs: [
      'https://www.facebook.com/novagross',
      'https://www.instagram.com/novagross',
      'https://twitter.com/novagross'
    ]
  }
}

/**
 * WebSite Schema with Sitelinks Search Box
 * Should be included on the homepage
 */
export function generateWebSiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Novagross',
    url: 'https://novagross.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://novagross.com/arama?q={search_term_string}',
      },
      // schema-dts doesn't currently type this schema.org extension key
      'query-input': 'required name=search_term_string',
    } as any,
  }
}

/**
 * WebPage Schema for static informational pages
 */
export interface WebPageSchemaInput {
  name: string
  description?: string
  url: string
  dateModified?: string
}

export function generateWebPageSchema(input: WebPageSchemaInput): WithContext<WebPage> {
  const schema: WithContext<WebPage> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    url: `https://novagross.com${input.url}`,
    inLanguage: 'tr-TR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Novagross',
      url: 'https://novagross.com',
    },
  }

  if (input.description) schema.description = input.description
  if (input.dateModified) schema.dateModified = input.dateModified

  return schema
}

/**
 * Product Schema for individual product pages
 */
export interface ProductSchemaInput {
  name: string
  description: string
  image: string[]
  sku: string
  brand?: string
  price: number
  priceCurrency?: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition'
  rating?: {
    value: number
    count: number
  }
  url: string
}

export function generateProductSchema(input: ProductSchemaInput): WithContext<Product> {
  const schema: WithContext<Product> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.image,
    sku: input.sku,
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: input.priceCurrency || 'TRY',
      price: input.price.toString(),
      availability: `https://schema.org/${input.availability}`,
      itemCondition: input.condition ? `https://schema.org/${input.condition}` : 'https://schema.org/NewCondition'
    }
  }

  if (input.brand) {
    schema.brand = {
      '@type': 'Brand',
      name: input.brand
    }
  }

  if (input.rating && input.rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.value,
      reviewCount: input.rating.count,
    }
  }

  return schema
}

/**
 * BreadcrumbList Schema for navigation
 */
export interface BreadcrumbItem {
  name: string
  url: string
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://novagross.com${item.url}`
    }))
  }
}

/**
 * Helper function to render JSON-LD script tag
 */
export function renderJsonLd(data: WithContext<any>): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Review Schema for product reviews
 */
export interface ReviewSchemaInput {
  productName: string
  reviewAuthor: string
  reviewRating: number // 1-5
  reviewBody: string
  datePublished: string // ISO 8601 format
}

export function generateReviewSchema(input: ReviewSchemaInput): WithContext<Review> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: input.productName,
    },
    author: {
      '@type': 'Person',
      name: input.reviewAuthor,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.reviewRating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: input.reviewBody,
    datePublished: input.datePublished,
  }
}

/**
 * LocalBusiness Schema for local SEO
 * Should be included on contact page and footer
 */
export function generateLocalBusinessSchema(): WithContext<LocalBusiness> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://novagross.com/#localbusiness',
    name: 'Novagross',
    image: 'https://novagross.com/logo.png',
    url: 'https://novagross.com',
    telephone: '+90-850-850-20-20',
    email: 'info@novagross.com',
    priceRange: '₺₺',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23',
      addressLocality: 'Sıncan',
      addressRegion: 'Ankara',
      postalCode: '06000',
      addressCountry: 'TR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 39.9334,
      longitude: 32.8597,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    sameAs: [
      'https://www.facebook.com/novagross',
      'https://www.instagram.com/novagross',
      'https://twitter.com/novagross',
    ],
  }
}
