'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, PageHeader } from '@novagross/ui'
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { validateImageUpload, safeUploadPath } from '@novagross/utils'

interface Category {
  id: string
  name: string
  slug: string
}

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_price: '',
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name')
    
    if (data) setCategories(data)
  }

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      alert('En fazla 5 görsel yükleyebilirsiniz')
      return
    }
    
    setImages(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (productId: string) => {
    const uploadedUrls: string[] = []
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      // SECURITY: MIME/ext whitelist
      const v = validateImageUpload(file)
      if (!v.ok) throw new Error(v.error)
      const fileName = safeUploadPath(productId, v.ext)

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: file.type })

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('Görsel yükleme başarısız (boş yanıt)')
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        throw new Error('Görsel public URL alınamadı')
      }

      uploadedUrls.push(urlData.publicUrl)
    }
    
    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const user = authData?.user
      if (!user) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      }

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (storeError) throw storeError
      if (!store?.id) {
        throw new Error('Mağaza bulunamadı. Ürün eklemek için önce mağaza oluşturmalısınız.')
      }

      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          price: parseFloat(formData.price),
          compare_at_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
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
        .select()
        .single()

      if (productError) throw productError

      // Upload images if any
      if (images.length > 0 && product) {
        const imageUrls = await uploadImages(product.id)
        
        // Save image records
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/urunler"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Ürünlere Dön
        </Link>
      </div>

      <PageHeader
        title="Yeni Ürün Ekle"
        description="Ürün bilgilerini doldurup kaydet"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle>Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ürün Adı *</label>
                <Input
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Ürün adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="urun-slug"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Açıklama</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ürün açıklaması"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
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
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Marka adı"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fiyatlandırma */}
        <Card>
          <CardHeader>
            <CardTitle>Fiyatlandırma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Satış Fiyatı (₺) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Karşılaştırma Fiyatı (₺)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.compare_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, compare_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maliyet Fiyatı (₺)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stok & SKU */}
        <Card>
          <CardHeader>
            <CardTitle>Stok ve Envanter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Barkod</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="1234567890123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stok Adedi</label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Düşük Stok Eşiği</label>
                <Input
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                  placeholder="5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Görseller */}
        <Card>
          <CardHeader>
            <CardTitle>Ürün Görselleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mb-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">
                      Ana Görsel
                    </span>
                  )}
                </div>
              ))}
              
              {images.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Görsel Ekle</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
            <p className="text-sm text-gray-500">
              En fazla 5 görsel yükleyebilirsiniz. İlk görsel ana görsel olarak kullanılır.
            </p>
          </CardContent>
        </Card>

        {/* Durum */}
        <Card>
          <CardHeader>
            <CardTitle>Ürün Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Aktif (Satışta)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Öne Çıkan Ürün</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Meta Başlık</label>
              <Input
                value={formData.meta_title}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                placeholder="Arama sonuçlarında görünecek başlık"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meta Açıklama</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Arama sonuçlarında görünecek açıklama (160 karakter önerilir)"
              />
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
            Ürünü Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}
