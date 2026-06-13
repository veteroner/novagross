import Link from 'next/link'
import { Button } from '@novagross/ui'
import { createClient } from '@/lib/supabase/server'
import { SortSelect } from '@/components/product/sort-select'
import { ProductCard } from '@/components/product/product-card'
import { enrichProducts } from '@/lib/products/enrich'

const PRODUCTS_PER_PAGE = 12

function parsePositiveInt(value: unknown, fallback: number) {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

function buildPageHref(
  searchParams: { [key: string]: string | string[] | undefined } | undefined,
  page: number
) {
  const urlSearchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === 'page') continue
    if (typeof value === 'string') urlSearchParams.set(key, value)
    else if (Array.isArray(value)) for (const v of value) urlSearchParams.append(key, v)
  }
  if (page > 1) urlSearchParams.set('page', String(page))
  const qs = urlSearchParams.toString()
  return qs ? `?${qs}` : '?'
}

interface ProductGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function ProductGrid({ searchParams }: ProductGridProps) {
  const supabase = await createClient()

  const page = parsePositiveInt(searchParams?.page, 1)
  const offset = (page - 1) * PRODUCTS_PER_PAGE
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const categorySlug =
    typeof searchParams?.category === 'string' ? searchParams.category : ''
  const minPrice =
    typeof searchParams?.min_price === 'string' ? parseFloat(searchParams.min_price) : null
  const maxPrice =
    typeof searchParams?.max_price === 'string' ? parseFloat(searchParams.max_price) : null
  const brand = typeof searchParams?.brand === 'string' ? searchParams.brand : ''

  let query = supabase
    .from('products')
    .select(
      `
      id, name, slug, price, compare_at_price, stock, category_id, brand, store_id, created_at,
      product_images ( url, sort_order, is_primary )
    `,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('is_active', true)
      .maybeSingle()

    if (category?.id) {
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', category.id)
        .eq('is_active', true)
      const childIds = (children ?? []).map((c) => c.id).filter(Boolean)
      const categoryIds = [category.id, ...childIds]
      query = query.in('category_id', categoryIds)
    }
  }

  if (minPrice !== null) query = query.gte('price', minPrice)
  if (maxPrice !== null) query = query.lte('price', maxPrice)
  if (brand) query = query.ilike('brand', brand)
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`
    )
  }

  const sortBy = searchParams?.sort as string
  switch (sortBy) {
    case 'price-asc':
      query = query.order('price', { ascending: true })
      break
    case 'price-desc':
      query = query.order('price', { ascending: false })
      break
    case 'popular':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: products, error, count } = await query.range(
    offset,
    offset + PRODUCTS_PER_PAGE - 1
  )

  if (error || !products || products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Ürün bulunamadı.</p>
      </div>
    )
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE))

  const enriched = await enrichProducts(supabase as any, products as any, q || undefined)

  // Sponsored ürünler listenin başına gelir (sadece ilk sayfada göster, sonrakilerde karışmasın)
  const cards =
    page === 1
      ? [...enriched.filter((p) => p.is_sponsored), ...enriched.filter((p) => !p.is_sponsored)]
      : enriched

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-foreground">{totalCount} ürün bulundu</p>
        <SortSelect />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-8">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            Önceki
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageHref(searchParams, page - 1)}>Önceki</Link>
          </Button>
        )}

        {(() => {
          const maxButtons = 5
          let start = Math.max(1, page - 2)
          let end = Math.min(totalPages, start + maxButtons - 1)
          start = Math.max(1, end - maxButtons + 1)
          const pageItems: Array<number | 'ellipsis'> = []
          if (start > 1) {
            pageItems.push(1)
            if (start > 2) pageItems.push('ellipsis')
          }
          for (let p = start; p <= end; p++) pageItems.push(p)
          if (end < totalPages) {
            if (end < totalPages - 1) pageItems.push('ellipsis')
            pageItems.push(totalPages)
          }
          return pageItems.map((item, idx) => {
            if (item === 'ellipsis') {
              return (
                <span key={`e-${idx}`} className="px-2 text-muted-foreground">
                  …
                </span>
              )
            }
            const p = item
            const isActive = p === page
            return (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className={isActive ? 'bg-primary text-primary-foreground' : undefined}
                disabled={isActive}
                asChild={!isActive}
              >
                {isActive ? (
                  <span>{p}</span>
                ) : (
                  <Link href={buildPageHref(searchParams, p)}>{p}</Link>
                )}
              </Button>
            )
          })
        })()}

        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Sonraki
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageHref(searchParams, page + 1)}>Sonraki</Link>
          </Button>
        )}
      </div>

      {page < totalPages && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Sayfa {page} / {totalPages} • Toplam {totalCount} ürün
          </p>
        </div>
      )}
    </div>
  )
}
