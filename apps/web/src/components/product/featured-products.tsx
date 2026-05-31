import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/product/product-card'
import { enrichProducts } from '@/lib/products/enrich'

export async function FeaturedProducts() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, slug, price, compare_at_price, stock, category_id, brand, store_id,
      product_images ( url, sort_order, is_primary )
    `
    )
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('is_featured', true)
    .limit(8)

  if (error || !data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Öne çıkan ürün bulunamadı.</p>
      </div>
    )
  }

  const cards = await enrichProducts(supabase as any, data as any)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
