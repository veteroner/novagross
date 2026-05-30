'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, Input, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
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
  approval_status: string | null
  category: { name: string } | null
}

type Filter = 'all' | 'active' | 'inactive' | 'out_of_stock' | 'pending'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trendikon.com').replace(/\/$/, '')

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
        approval_status,
        category:categories(name)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data as any)
    }
    setLoading(false)
  }

  const counts = {
    all: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
    out_of_stock: products.filter((p) => (p.stock ?? 0) === 0).length,
    pending: products.filter((p) => p.approval_status === 'pending').length,
  }

  const filteredProducts = products
    .filter((p) => {
      if (filter === 'active') return p.is_active
      if (filter === 'inactive') return !p.is_active
      if (filter === 'out_of_stock') return (p.stock ?? 0) === 0
      if (filter === 'pending') return p.approval_status === 'pending'
      return true
    })
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    )

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: counts.all },
    { key: 'active', label: 'Aktif', count: counts.active },
    { key: 'inactive', label: 'Pasif', count: counts.inactive },
    { key: 'out_of_stock', label: 'Stoksuz', count: counts.out_of_stock },
    { key: 'pending', label: 'Onay Bekliyor', count: counts.pending },
  ]

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
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        description={loading ? 'Yükleniyor…' : `${products.length} ürün`}
        actions={
          <Link href="/urunler/ekle">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ürün
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ürün adı veya SKU ile ara..."
            className="pl-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <TabBar
        items={tabs}
        value={filter}
        onChange={(k) => setFilter(k as Filter)}
      />

      <Card>
        <CardContent className="p-0">
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
                <EmptyState
                  compact
                  icon={Plus}
                  title={search ? 'Aramaya uygun ürün yok' : 'Henüz ürün yok'}
                  description={
                    search
                      ? 'Farklı bir anahtar kelime dene.'
                      : 'Sağ üstteki "Yeni Ürün" ile başlayabilirsin.'
                  }
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
