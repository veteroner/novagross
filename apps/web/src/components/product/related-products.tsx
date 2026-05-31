import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/product/product-card'
import { enrichProducts } from '@/lib/products/enrich'

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
    .select(
      `
      id, name, slug, price, compare_at_price, stock, category_id, brand, store_id,
      product_images ( url, sort_order, is_primary )
    `
    )
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

  const cards = await enrichProducts(supabase as any, products as any)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
