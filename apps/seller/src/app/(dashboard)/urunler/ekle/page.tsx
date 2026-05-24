'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

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
    const supabase = createClient()

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (store) setStoreId(store.id)

      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (cats) setCategories(cats)
    }

    init()
  }, [])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    setFormData(prev => ({ ...prev, name, slug }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const uploadImages = async (productId: string) => {
    const supabase = createClient()
    const imageUrls: string[] = []

    for (const file of images) {
      const fileName = `${productId}/${Date.now()}-${file.name}`

      const { error, data } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) throw new Error(`Görsel yükleme hatası: ${error.message}`)

      if (data) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)
        imageUrls.push(urlData.publicUrl)
      }
    }

    return imageUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeId) {
      alert('Mağaza bulunamadı!')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
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
          approval_status: 'pending',
        })
        .select()
        .single()

      if (productError) throw productError

      if (images.length > 0 && product) {
        const imageUrls = await uploadImages(product.id)

        const imageRecords = imageUrls.map((url, index) => ({
          product_id: product.id,
          url,
          sort_order: index,
          is_primary: index === 0,
        }))

        const { error: imagesInsertError } = await supabase.from('product_images').insert(imageRecords)
        if (imagesInsertError) throw imagesInsertError
      }

      router.push('/urunler')
    } catch (error: any) {
      console.error('Error creating product:', error)
      alert(error.message || 'Ürün eklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/urunler">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni Ürün Ekle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader><CardTitle>Temel Bilgiler</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ürün Adı *</label>
                <Input value={formData.name} onChange={handleNameChange} placeholder="Ürün adını girin" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <Input value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} placeholder="urun-slug" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Açıklama</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ürün açıklaması"
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
                <Input value={formData.brand} onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))} placeholder="Marka adı" />
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
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="0.00" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Karşılaştırma Fiyatı (₺)</label>
                <Input type="number" step="0.01" value={formData.compare_at_price} onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maliyet Fiyatı (₺)</label>
                <Input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))} placeholder="0.00" />
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
                <Input value={formData.sku} onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))} placeholder="SKU-001" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Barkod</label>
                <Input value={formData.barcode} onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))} placeholder="1234567890123" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stok Adedi</label>
                <Input type="number" value={formData.stock} onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Düşük Stok Eşiği</label>
                <Input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))} placeholder="5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ağırlık */}
        <Card>
          <CardHeader><CardTitle>Kargo Bilgileri</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <label className="block text-sm font-medium mb-2">Ağırlık (kg)</label>
              <Input type="number" step="0.01" value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))} placeholder="0.00" />
            </div>
          </CardContent>
        </Card>

        {/* Görseller */}
        <Card>
          <CardHeader><CardTitle>Ürün Görselleri</CardTitle></CardHeader>
          <CardContent>
            <Input type="file" multiple accept="image/*" onChange={handleImageChange} />
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <img key={index} src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded border" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Meta Başlık</label>
              <Input value={formData.meta_title} onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))} placeholder="Meta başlık" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meta Açıklama</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Meta açıklama"
              />
            </div>
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
            <p className="text-sm text-amber-600">
              ⚠️ Ürününüz admin onayından sonra yayınlanacaktır
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/urunler">
            <Button variant="outline" type="button">İptal</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ürünü Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}
