import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/product/product-card'
import { enrichProducts } from '@/lib/products/enrich'

type RawProduct = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number | null
  category_id?: string | null
  store_id?: string | null
  brand?: string | null
  product_images: Array<{
    id?: string
    url: string
    sort_order: number | null
    is_primary?: boolean | null
  }> | null
}

export default async function StoreProducts({ products }: { products: RawProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold mb-2">Henüz ürün yok</h3>
        <p className="text-gray-600">Bu mağazada henüz ürün bulunmuyor</p>
      </div>
    )
  }

  const supabase = await createClient()
  const cards = await enrichProducts(supabase as any, products as any)

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
