import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductFilters } from '@/components/product/product-filters'
import { Skeleton } from '@novagross/ui'
import { getCategoriesWithCounts } from '@/lib/supabase/category-queries'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!category) return { title: 'Kategori Bulunamadı' }

  return genMetadata({
    title: category.name,
    description: `${category.name} kategorisindeki tüm ürünler. En uygun fiyatlarla online alışveriş.`,
    keywords: [category.name.toLowerCase(), 'online alışveriş', 'e-ticaret', 'kampanya'],
    url: `/kategori/${params.slug}`,
  })
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()

  const categoriesWithCounts = await getCategoriesWithCounts()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!category) notFound()

  const { data: subcategories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('parent_id', category.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <p className="text-muted-foreground mt-1">
          {category.name} kategorisindeki ürünlere göz atın.
        </p>

        {subcategories && subcategories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <a
                key={sub.id}
                href={`/kategori/${sub.slug}`}
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                {sub.name}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <ProductFilters categories={categoriesWithCounts} />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid searchParams={{ ...searchParams, category: params.slug }} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
