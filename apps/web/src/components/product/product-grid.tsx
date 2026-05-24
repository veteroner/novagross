import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, Badge, Button } from '@novagross/ui'
import { formatPrice, calculateDiscount } from '@novagross/utils'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AddToCartQuickButton } from '@/components/product/add-to-cart-quick-button'
import { SortSelect } from '@/components/product/sort-select'

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
    else if (Array.isArray(value)) {
      for (const v of value) urlSearchParams.append(key, v)
    }
  }

  if (page > 1) urlSearchParams.set('page', String(page))

  const qs = urlSearchParams.toString()
  return qs ? `?${qs}` : '?'
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number | null
  category_id: string | null
  brand?: string | null
  product_images?: Array<{ url: string; sort_order: number | null; is_primary: boolean | null }> | null
}

interface ProductGridProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function ProductGrid({ searchParams }: ProductGridProps) {
  const supabase = await createClient()

  const page = parsePositiveInt(searchParams?.page, 1)
  const offset = (page - 1) * PRODUCTS_PER_PAGE
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const categorySlug = typeof searchParams?.category === 'string' ? searchParams.category : ''
  const minPrice = typeof searchParams?.min_price === 'string' ? parseFloat(searchParams.min_price) : null
  const maxPrice = typeof searchParams?.max_price === 'string' ? parseFloat(searchParams.max_price) : null
  const brand = typeof searchParams?.brand === 'string' ? searchParams.brand : ''
  
  // Supabase'den ürünleri çek
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      price,
      compare_at_price,
      stock,
      category_id,
      brand,
      product_images (
        url,
        sort_order,
        is_primary
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  // Category filter
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

  // Price range filter
  if (minPrice !== null) {
    query = query.gte('price', minPrice)
  }
  if (maxPrice !== null) {
    query = query.lte('price', maxPrice)
  }

  // Brand filter
  if (brand) {
    query = query.ilike('brand', brand)
  }

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`
    )
  }
  
  // Sıralama
  const sortBy = searchParams?.sort as string
  switch (sortBy) {
    case 'price-asc':
      query = query.order('price', { ascending: true })
      break
    case 'price-desc':
      query = query.order('price', { ascending: false })
      break
    case 'popular':
      // Popularity metric not modeled on products table yet; fallback to newest
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }
  
  const { data: products, error, count } = await query.range(
    offset,
    offset + PRODUCTS_PER_PAGE - 1
  )

  const displayProducts: Product[] = error || !products ? [] : products
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE))

  const categoryIds = Array.from(
    new Set(displayProducts.map((p) => p.category_id).filter(Boolean))
  ) as string[]

  const categoriesById = new Map<string, { name: string }>()
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)

    for (const c of categories ?? []) {
      categoriesById.set(c.id, { name: c.name })
    }
  }

  if (displayProducts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Ürün bulunamadı.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Sorting & View Options */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-foreground">
          {totalCount} ürün bulundu
        </p>
        <SortSelect />
      </div>

      {/* Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProducts.map((product) => (
          (() => {
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
                  alt={`${product.name}${product.category_id && categoriesById.has(product.category_id) ? ` - ${categoriesById.get(product.category_id)!.name}` : ''}${product.brand ? ` (${product.brand})` : ''}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground">
                  📦
                </div>
              )}

              {/* Discount Badge */}
              {product.compare_at_price && (
                <Badge variant="destructive" className="absolute top-2 left-2">
                  %{calculateDiscount(product.price, product.compare_at_price)} İndirim
                </Badge>
              )}

              {/* Quick Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick View Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Link href={`/urun/${product.slug}`}>
                  <Button variant="secondary">Hızlı Bakış</Button>
                </Link>
              </div>
            </div>

            <CardContent className="p-4">
              {/* Category */}
              <p className="text-xs text-muted-foreground mb-1">
                {product.category_id ? categoriesById.get(product.category_id)?.name || 'Kategori' : 'Kategori'}
              </p>

              {/* Title */}
              <Link href={`/urun/${product.slug}`}>
                <h3 className="font-medium text-foreground hover:text-primary line-clamp-2 min-h-[48px]">
                  {product.name}
                </h3>
              </Link>

              {/* Price */}
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold text-lg text-foreground">
                  {formatPrice(product.price)}
                </span>
                {product.compare_at_price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="mt-2 flex items-center gap-1">
                {product.stock === null || product.stock > 0 ? (
                  <span className="text-xs text-green-600">Stokta</span>
                ) : (
                  <span className="text-xs text-red-600">Tükendi</span>
                )}
              </div>

              {/* Add to Cart */}
              <AddToCartQuickButton product={{ ...product, image: firstImageUrl }} />
            </CardContent>
          </Card>
            )
          })()
        ))}
      </div>

      {/* Pagination */}
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
            <Link href={buildPageHref(searchParams, page + 1)}>
              <span>Sonraki</span>
              <svg className="ml-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        )}
      </div>

      {/* Loading indicator for pagination */}
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
