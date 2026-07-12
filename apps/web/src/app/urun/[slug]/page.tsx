import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Button, Badge, Card, CardContent } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { Truck, Shield, RotateCcw, Star } from 'lucide-react'
import { ProductImageGallery } from '@/components/product/product-image-gallery'
import { ProductVariantSelector } from '@/components/product/product-variant-selector'
import { ProductViewTracker } from '@/components/product/product-view-tracker'
import { getProductBySlug } from '@/lib/supabase/queries'
import { generateProductMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/structured-data'
import { Metadata } from 'next'

// Lazy load below-the-fold components for better LCP
const RelatedProducts = dynamic(() => import('@/components/product/related-products').then(mod => ({ default: mod.RelatedProducts })))
const ProductReviews = dynamic(() => import('@/components/product/product-reviews').then(mod => ({ default: mod.ProductReviews })))

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  
  if (!product) {
    return {
      title: 'Ürün Bulunamadı',
    }
  }

  return generateProductMetadata({
    name: product.name,
    description: product.description || '',
    price: product.price,
    image: product.images?.[0]?.url || '/placeholder.png',
    inStock: (product.stock || 0) > 0,
    category: product.category?.name,
  })
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  // Supabase'den ürün çek
  const product = await getProductBySlug(params.slug)
  
  if (!product) {
    notFound()
  }

  const productUrl = `/urun/${product.slug}`
  const imageUrls = product.images.map(img => img.url)

  return (
    <>
      {/* Product Schema for Google Shopping */}
      <JsonLd
        data={generateProductSchema({
          name: product.name,
          description: product.description || '',
          image: imageUrls,
          sku: product.id,
          brand: product.brand || product.store?.name || 'Novagross',
          price: product.price,
          priceCurrency: 'TRY',
          availability: (product.stock || 0) > 0 ? 'InStock' : 'OutOfStock',
          condition: 'NewCondition',
          rating: product.reviewCount > 0 ? {
            value: product.rating,
            count: product.reviewCount,
          } : undefined,
          url: productUrl,
        })}
      />
      
      {/* Breadcrumb Schema */}
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          ...(product.category ? [{ name: product.category.name, url: `/kategori/${product.category.slug}` }] : []),
          { name: product.name, url: productUrl },
        ])}
      />

      <ProductViewTracker productId={product.id} />

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <ProductImageGallery images={product.images} />
          </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category & Brand */}
          <div className="flex items-center gap-2 text-sm">
            {product.category ? (
              <a
                href={`/kategori/${product.category.slug}`}
                className="text-muted-foreground hover:text-primary"
              >
                {product.category.name}
              </a>
            ) : (
              <span className="text-muted-foreground">Kategori</span>
            )}
            <span className="text-muted-foreground">/</span>
            {product.store ? (
              <a
                href={`/magaza/${product.store.slug}`}
                className="text-muted-foreground hover:text-primary"
              >
                {product.store.name}
              </a>
            ) : (
              <span className="text-muted-foreground">Novagross</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.floor(product.rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-sm text-muted-foreground">
              ({product.reviewCount} değerlendirme)
            </span>
          </div>

          {/* Price, Variants, Stock & Add to Cart - Client Component */}
          <ProductVariantSelector
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              comparePrice: product.comparePrice,
              stock: product.stock,
              images: product.images.map((img) => ({ url: img.url })),
            }}
            variants={product.variants}
          />

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="text-center">
              <Truck className="h-6 w-6 mx-auto text-primary" />
              <p className="text-sm font-medium mt-2">Ücretsiz Kargo</p>
              <p className="text-xs text-muted-foreground">
                {product.store?.freeShippingThreshold === 0
                  ? 'Tüm siparişlerde'
                  : `${product.store?.freeShippingThreshold ?? 500}₺ üzeri`}
              </p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto text-primary" />
              <p className="text-sm font-medium mt-2">2 Yıl Garanti</p>
              <p className="text-xs text-muted-foreground">Resmi distribütör</p>
            </div>
            <div className="text-center">
              <RotateCcw className="h-6 w-6 mx-auto text-primary" />
              <p className="text-sm font-medium mt-2">14 Gün İade</p>
              <p className="text-xs text-muted-foreground">Koşulsuz iade</p>
            </div>
          </div>

          {/* Description */}
          <div className="pt-6 border-t">
            <h2 className="font-bold mb-4">Ürün Açıklaması</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
              {product.description}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Benzer Ürünler</h2>
        <RelatedProducts categorySlug={product.category?.slug || ''} currentProductId={product.id} />
      </section>

      {/* Product Reviews */}
      <section className="mt-16">
        <ProductReviews productId={product.id} />
      </section>
    </div>
    </>
  )
}
