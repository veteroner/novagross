import Link from 'next/link'
import dynamic from 'next/dynamic'
import { FeaturedProducts } from '@/components/product/featured-products'
import { CategoryGrid } from '@/components/home/category-grid'
import { DynamicBanner } from '@/components/home/dynamic-banner'
import { PromoGrid } from '@/components/home/promo-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/structured-data'

const NewsletterForm = dynamic(() => import('@/components/newsletter/newsletter-form').then(mod => ({ default: mod.NewsletterForm })))

export default function HomePage() {
  return (
    <>
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd data={generateWebSiteSchema()} />

      <div className="flex flex-col gap-8 pb-8">
        {/* Hero Banner */}
        <DynamicBanner />

        {/* 4-kutu promo grid */}
        <PromoGrid />

        {/* Kategoriler */}
        <section className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Kategoriler</h2>
            <Link href="/kategoriler" className="text-sm text-muted-foreground hover:text-primary">
              Tümünü Gör →
            </Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Öne Çıkan Ürünler */}
        <section className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Öne Çıkan Ürünler</h2>
            <Link href="/urunler" className="text-sm text-muted-foreground hover:text-primary">
              Tümünü Gör →
            </Link>
          </div>
          <FeaturedProducts />
        </section>

        {/* Bülten CTA */}
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
