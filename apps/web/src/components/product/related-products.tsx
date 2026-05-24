import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, Badge, Button } from '@novagross/ui'
import { formatPrice, calculateDiscount } from '@novagross/utils'
import { ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface RelatedProductsProps {
  categorySlug: string
  currentProductId: string
}

export async function RelatedProducts({ categorySlug, currentProductId }: RelatedProductsProps) {
  if (!categorySlug) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Benzer ürün bulunamadı.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', categorySlug)
    .single()

  if (!category) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Benzer ürün bulunamadı.</p>
      </div>
    )
  }

  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      price,
      compare_at_price,
      product_images (
        url,
        sort_order,
        is_primary
      )
    `)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('category_id', category.id)
    .neq('id', currentProductId)
    .order('created_at', { ascending: false })
    .limit(4)

  if (!products || products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Benzer ürün bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const images = (product.product_images ?? []).filter((img) => Boolean(img?.url))
        const primary = images.find((img) => img.is_primary)
        const sorted = images
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        const firstImageUrl = (primary?.url || sorted[0]?.url) ?? null

        return (
        <Card key={product.id} className="group overflow-hidden">
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            {firstImageUrl ? (
              <Image
                src={firstImageUrl}
                alt={`${product.name} - ${category.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground">
                📦
              </div>
            )}

            {product.compare_at_price && (
              <Badge variant="destructive" className="absolute top-2 left-2">
                %{calculateDiscount(product.price, product.compare_at_price)} İndirim
              </Badge>
            )}
          </div>

          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{category.name}</p>

            <Link href={`/urun/${product.slug}`}>
              <h3 className="font-medium hover:text-primary line-clamp-2 min-h-[48px]">
                {product.name}
              </h3>
            </Link>

            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold">{formatPrice(product.price)}</span>
              {product.compare_at_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>

            <Button className="w-full mt-4" size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sepete Ekle
            </Button>
          </CardContent>
        </Card>
        )
      })}
    </div>
  )
}
