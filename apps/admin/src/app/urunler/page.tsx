'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number
  is_active: boolean
  is_featured: boolean
  brand: string | null
  sku: string
  category: { name: string } | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com').replace(/\/$/, '')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        compare_at_price,
        stock,
        is_active,
        is_featured,
        brand,
        sku,
        category:categories(name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data as any)
    }
    setLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !isActive })
      .eq('id', id)

    if (!error) {
      setProducts(products.map(p => 
        p.id === id ? { ...p, is_active: !isActive } : p
      ))
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Ürünler</h1>
        <Link href="/urunler/ekle">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı veya SKU ile ara..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Ürün</th>
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 font-medium">Kategori</th>
                    <th className="text-left py-3 px-4 font-medium">Fiyat</th>
                    <th className="text-left py-3 px-4 font-medium">Stok</th>
                    <th className="text-left py-3 px-4 font-medium">Durum</th>
                    <th className="text-left py-3 px-4 font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.brand && (
                            <p className="text-sm text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{product.sku}</td>
                      <td className="py-3 px-4">{(product.category as any)?.name || '-'}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{formatPrice(product.price)}</p>
                          {product.compare_at_price && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.compare_at_price)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                          {product.stock}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={product.is_active ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => toggleActive(product.id, product.is_active)}
                        >
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <a href={`${siteUrl}/urun/${product.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </a>
                          <Link href={`/urunler/${product.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Ürün bulunamadı
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
