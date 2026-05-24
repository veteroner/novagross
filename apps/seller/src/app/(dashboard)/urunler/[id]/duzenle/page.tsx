'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_at_price: '',
    cost_price: '',
    sku: '',
    barcode: '',
    stock: '0',
    low_stock_threshold: '5',
    category_id: '',
    brand: '',
    is_active: true,
    is_featured: false,
    weight: '',
    meta_title: '',
    meta_description: '',
  })

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (!store) return
        setStoreId(store.id)

        // Fetch categories
        const { data: cats } = await supabase.from('categories').select('id, name').order('name')
        if (cats) setCategories(cats)

        // Fetch product
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('store_id', store.id)
          .single()

        if (error || !product) {
          alert('Ürün bulunamadı veya erişim yetkiniz yok')
          router.push('/urunler')
          return
        }

        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          compare_at_price: product.compare_at_price?.toString() || '',
          cost_price: product.cost_price?.toString() || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          stock: (product.stock ?? 0).toString(),
          low_stock_threshold: (product.low_stock_threshold ?? 5).toString(),
          category_id: product.category_id || '',
          brand: product.brand || '',
          is_active: product.is_active ?? true,
          is_featured: product.is_featured ?? false,
          weight: product.weight?.toString() || '',
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
        })

        // Fetch existing images
        const { data: images } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('sort_order')

        setExistingImages(images || [])
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setFetching(false)
      }
    }

    fetchProduct()
  }, [productId, router])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    setFormData(prev => ({ ...prev, name, slug }))
  }

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewImages(files)
    setNewImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const removeExistingImage = async (imageId: string) => {
    if (!confirm('Bu görseli silmek istediğinizden emin misiniz?')) return
    try {
      const supabase = createClient()
      await supabase.from('product_images').delete().eq('id', imageId)
      setExistingImages(prev => prev.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  const uploadNewImages = async () => {
    const supabase = createClient()
    const imageUrls: string[] = []

    for (const file of newImages) {
      const fileName = `${productId}/${Date.now()}-${file.name}`
      const { error, data } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) throw new Error(`Görsel yükleme hatası: ${error.message}`)
      if (data) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
        imageUrls.push(urlData.publicUrl)
      }
    }

    return imageUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) { alert('Mağaza bulunamadı!'); return }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          price: parseFloat(formData.price),
          compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          stock: parseInt(formData.stock),
          low_stock_threshold: parseInt(formData.low_stock_threshold),
          category_id: formData.category_id || null,
          brand: formData.brand || null,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
        })
        .eq('id', productId)
        .eq('store_id', storeId)

      if (updateError) throw updateError

      // Upload new images
      if (newImages.length > 0) {
        const imageUrls = await uploadNewImages()
        const startOrder = existingImages.length

        const imageRecords = imageUrls.map((url, index) => ({
          product_id: productId,
          url,
          sort_order: startOrder + index,
          is_primary: existingImages.length === 0 && index === 0,
        }))

        const { error: imgError } = await supabase.from('product_images').insert(imageRecords)
        if (imgError) throw imgError
      }

      router.push('/urunler')
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(error.message || 'Ürün güncellenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Ürün yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/urunler">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Ürünü Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader><CardTitle>Temel Bilgiler</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ürün Adı *</label>
                <Input value={formData.name} onChange={handleNameChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <Input value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Açıklama</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                >
                  <option value="">Kategori seçin</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marka</label>
                <Input value={formData.brand} onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fiyatlandırma */}
        <Card>
          <CardHeader><CardTitle>Fiyatlandırma</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Satış Fiyatı (₺) *</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Karşılaştırma Fiyatı (₺)</label>
                <Input type="number" step="0.01" value={formData.compare_at_price} onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maliyet Fiyatı (₺)</label>
                <Input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stok & SKU */}
        <Card>
          <CardHeader><CardTitle>Stok ve Envanter</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SKU</label>
                <Input value={formData.sku} onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Barkod</label>
                <Input value={formData.barcode} onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stok Adedi</label>
                <Input type="number" value={formData.stock} onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Düşük Stok Eşiği</label>
                <Input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mevcut Görseller */}
        {existingImages.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Mevcut Görseller</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.url} alt="Ürün görseli" className="w-full h-32 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {img.is_primary && (
                      <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">Ana</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Yeni Görseller */}
        <Card>
          <CardHeader><CardTitle>Yeni Görsel Ekle</CardTitle></CardHeader>
          <CardContent>
            <Input type="file" multiple accept="image/*" onChange={handleNewImageChange} />
            {newImagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {newImagePreviews.map((preview, index) => (
                  <img key={index} src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded border" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Durum */}
        <Card>
          <CardHeader><CardTitle>Durum</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} />
              <label htmlFor="is_active">Aktif</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))} />
              <label htmlFor="is_featured">Öne Çıkan</label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/urunler">
            <Button variant="outline" type="button">İptal</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Değişiklikleri Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}
