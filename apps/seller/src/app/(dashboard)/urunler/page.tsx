'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { Package, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SellerProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  const fetchProducts = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('id', ((await (supabase as any).rpc('get_my_store')).data?.[0]?.store_id) ?? '')
        .single()

      if (!store) return
      setStoreId(store.id)

      const { data: productsData } = await supabase
        .from('products')
        .select(`*, category:categories(name)`)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

      setProducts(productsData || [])
      setFilteredProducts(productsData || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId)
      fetchProducts()
    } catch (error) {
      console.error('Failed to toggle product status:', error)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    try {
      const supabase = createClient()
      await supabase.from('products').delete().eq('id', productId)
      fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ürünlerim</h1>
          <p className="text-gray-600">{products.length} ürün</p>
        </div>
        <Link href="/urunler/ekle">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Yeni Ürün Ekle
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Ürün adı veya SKU ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ürün Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? 'Ürün bulunamadı' : 'Henüz ürün eklemediniz'}</p>
              {!searchQuery && (
                <Link href="/urunler/ekle">
                  <Button className="mt-4">İlk Ürünü Ekle</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Ürün</th>
                    <th className="text-left p-4 font-semibold">Kategori</th>
                    <th className="text-left p-4 font-semibold">Fiyat</th>
                    <th className="text-left p-4 font-semibold">Stok</th>
                    <th className="text-left p-4 font-semibold">Onay</th>
                    <th className="text-left p-4 font-semibold">Durum</th>
                    <th className="text-right p-4 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{product.category?.name || '-'}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">₺{product.price?.toFixed(2)}</p>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <p className="text-sm text-gray-500 line-through">
                            ₺{product.compare_at_price.toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-sm ${
                          product.stock_quantity === 0 ? 'text-red-600 font-semibold' :
                          product.stock_quantity < 10 ? 'text-orange-600' : 'text-gray-600'
                        }`}>
                          {product.stock_quantity ?? product.stock ?? 0} adet
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                          product.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.approval_status === 'approved' ? 'Onaylı' :
                           product.approval_status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductStatus(product.id, product.is_active)}
                            title={product.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Link href={`/urunler/${product.id}/duzenle`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
