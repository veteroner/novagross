import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@novagross/ui'
import { FeaturedProducts } from '@/components/product/featured-products'
import { CategoryGrid } from '@/components/home/category-grid'
import { DynamicBanner } from '@/components/home/dynamic-banner'
import { JsonLd } from '@/components/seo/json-ld'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/structured-data'

// Lazy load below-the-fold newsletter form
const NewsletterForm = dynamic(() => import('@/components/newsletter/newsletter-form').then(mod => ({ default: mod.NewsletterForm })))

export default function HomePage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd data={generateWebSiteSchema()} />
      
      <div className="flex flex-col gap-8 pb-8">
      {/* Hero Banner */}
      <DynamicBanner />

      {/* Categories */}
      <section className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Kategoriler</h2>
          <Link href="/kategoriler" className="text-sm text-muted-foreground hover:text-primary">
            Tümünü Gör →
          </Link>
        </div>
        <CategoryGrid />
      </section>

      {/* Featured Products */}
      <section className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Öne Çıkan Ürünler</h2>
          <Link href="/urunler" className="text-sm text-muted-foreground hover:text-primary">
            Tümünü Gör →
          </Link>
        </div>
        <FeaturedProducts />
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Fırsatları Kaçırma!</h2>
          <p className="text-lg mb-6">
            Yeni ürünlerden ve kampanyalardan haberdar olmak için bültenimize abone olun.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
    </>
  )
}
