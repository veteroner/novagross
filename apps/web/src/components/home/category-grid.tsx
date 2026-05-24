'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const supabase = createClient()
        
        // Get categories with their first product image
        const { data, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            slug,
            sort_order
          `)
          .eq('is_active', true)
          .order('sort_order')
        
        if (error) throw error
        
        if (data && data.length > 0) {
          // Fetch first product image for each category
          const categoriesWithImages = await Promise.all(
            data.map(async (category) => {
              // First try to get products directly from this category
              let { data: productRows } = await supabase
                .from('products')
                .select(`
                  id,
                  product_images(url, is_primary)
                `)
                .eq('category_id', category.id)
                .eq('is_active', true)
                .limit(5)

              // Find the first product that has a primary image
              let imageUrl: string | null = null
              for (const p of productRows || []) {
                const primary = (p.product_images as any[])?.find((img: any) => img.is_primary)
                if (primary?.url) { imageUrl = primary.url; break }
                const any_ = (p.product_images as any[])?.[0]
                if (any_?.url && !imageUrl) { imageUrl = any_.url }
              }

              // If no image found (parent category), try child categories
              if (!imageUrl) {
                const { data: childCategories } = await supabase
                  .from('categories')
                  .select('id')
                  .eq('parent_id', category.id)
                  .eq('is_active', true)
                
                if (childCategories && childCategories.length > 0) {
                  const childIds = childCategories.map(c => c.id)
                  const { data: childProductRows } = await supabase
                    .from('products')
                    .select(`
                      id,
                      product_images(url, is_primary)
                    `)
                    .in('category_id', childIds)
                    .eq('is_active', true)
                    .limit(5)

                  for (const p of childProductRows || []) {
                    const primary = (p.product_images as any[])?.find((img: any) => img.is_primary)
                    if (primary?.url) { imageUrl = primary.url; break }
                    const any_ = (p.product_images as any[])?.[0]
                    if (any_?.url && !imageUrl) { imageUrl = any_.url }
                  }
                }
              }
              
              return {
                ...category,
                image_url: imageUrl
              }
            })
          )
          
          setCategories(categoriesWithImages)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 text-center animate-pulse">
            <div className="aspect-square bg-muted rounded-lg mx-auto mb-3" />
            <div className="h-4 bg-muted rounded w-20 mx-auto" />
          </Card>
        ))}
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Henüz kategori yok.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => (
        <Link key={category.id} href={`/kategori/${category.slug}`}>
          <Card className="p-4 text-center hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-muted">
              {category.image_url ? (
                <Image
                  src={category.image_url}
                  alt={category.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground">
                  📦
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm line-clamp-2">{category.name}</h3>
          </Card>
        </Link>
      ))}
    </div>
  )
}
