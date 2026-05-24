'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, Badge, Button } from '@novagross/ui'
import { formatPrice, calculateDiscount } from '@novagross/utils'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cart-store'
import { toast } from '@/components/ui/toast'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number
  category_id: string | null
  category?: { name: string; slug: string } | null
  product_images?: Array<{ url: string; sort_order: number | null; is_primary: boolean | null }> | null
  image_url?: string | null
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set())
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            price,
            compare_at_price,
            stock,
            category_id,
            product_images (
              url,
              sort_order,
              is_primary
            )
          `)
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .eq('is_featured', true)
          .limit(8)
        
        if (error) throw error
        
        const fetched = (data ?? []) as Product[]
        if (fetched.length === 0) return

        const categoryIds = Array.from(
          new Set(fetched.map((p) => p.category_id).filter(Boolean))
        ) as string[]

        const categoriesById = new Map<string, { name: string; slug: string }>()
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, name, slug')
            .in('id', categoryIds)

          for (const c of categories ?? []) {
            categoriesById.set(c.id, { name: c.name, slug: c.slug })
          }
        }

        setProducts(
          fetched.map((p) => ({
            ...p,
            category: p.category_id ? categoriesById.get(p.category_id) ?? null : null,
            image_url: (() => {
              const images = (p.product_images ?? []).filter((img) => Boolean(img?.url))
              const primary = images.find((img) => img.is_primary)
              const sorted = images
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              return (primary?.url || sorted[0]?.url) ?? null
            })(),
          }))
        )
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      variantId: null,
      quantity: 1,
      price: product.price,
      name: product.name,
      image: product.image_url ?? null,
    })
    
    // Show success toast
    toast.success(`${product.name} sepete eklendi!`)
    
    setAddedProducts(prev => new Set(prev).add(product.id))
    setTimeout(() => {
      setAddedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(product.id)
        return newSet
      })
    }, 2000)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted" />
            <CardContent className="p-4">
              <div className="h-3 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-6 bg-muted rounded w-24 mb-4" />
              <div className="h-9 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Öne çıkan ürün bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <Card key={product.id} className="group overflow-hidden">
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={`${product.name}${product.category?.name ? ` - ${product.category.name}` : ''}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                loading={index < 2 ? undefined : "lazy"}
                priority={index < 2}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                📦
              </div>
            )}
            
            {/* Discount Badge */}
            {product.compare_at_price != null && product.compare_at_price > product.price && (
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
          </div>

          <CardContent className="p-4">
            {/* Category */}
            <p className="text-xs text-muted-foreground mb-1">
              {product.category?.name || 'Kategori'}
            </p>
            
            {/* Title */}
            <Link href={`/urun/${product.slug}`}>
              <h3 className="font-medium hover:text-primary line-clamp-2 min-h-[48px]">
                {product.name}
              </h3>
            </Link>

            {/* Stock Status */}
            <div className="mt-2 flex items-center gap-1.5">
              {product.stock > 0 ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">
                    {product.stock <= 5 ? `Son ${product.stock} adet` : 'Stokta'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-xs text-red-600">Tükendi</span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold text-lg">{formatPrice(product.price)}</span>
              {product.compare_at_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>

            {/* Add to Cart */}
            <Button 
              className="w-full mt-4" 
              size="sm"
              onClick={() => handleAddToCart(product)}
              disabled={addedProducts.has(product.id) || product.stock <= 0}
            >
              {addedProducts.has(product.id) ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Eklendi
                </>
              ) : product.stock <= 0 ? (
                'Stokta Yok'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sepete Ekle
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
