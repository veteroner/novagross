'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@novagross/ui'
import { ArrowLeft, Upload, X, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductImage {
  id: string
  url: string
  is_primary: boolean
  sort_order: number
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  
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
    fetchProduct()
  }, [productId])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name')
    
    if (data) setCategories(data)
  }

  const fetchProduct = async () => {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(id, url, is_primary, sort_order)
      `)
      .eq('id', productId)
      .single()

    if (error || !product) {
      alert('Ürün bulunamadı')
      router.push('/urunler')
      return
    }

    setFormData({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      compare_price: product.compare_at_price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stock: product.stock?.toString() || '0',
      low_stock_threshold: product.low_stock_threshold?.toString() || '5',
      category_id: product.category_id || '',
      brand: product.brand || '',
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      weight: product.weight?.toString() || '',
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
    })

    setExistingImages(product.images || [])
    setLoading(false)
  }

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

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = existingImages.length + newImages.length + files.length
    
    if (totalImages > 5) {
      alert('En fazla 5 görsel yükleyebilirsiniz')
      return
    }
    
    setNewImages(prev => [...prev, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = async (imageId: string) => {
    if (!confirm('Bu görseli silmek istediğinize emin misiniz?')) return
    
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (!error) {
      setExistingImages(prev => prev.filter(img => img.id !== imageId))
    }
  }

  const uploadImages = async () => {
    const uploadedUrls: string[] = []
    
    for (let i = 0; i < newImages.length; i++) {
      const file = newImages[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${productId}/${Date.now()}_${i}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)

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
    setSaving(true)

    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (productError) throw productError

      // Upload new images if any
      if (newImages.length > 0) {
        const imageUrls = await uploadImages()
        const startOrder = existingImages.length
        
        const imageRecords = imageUrls.map((url, index) => ({
          product_id: productId,
          url,
          sort_order: startOrder + index,
          is_primary: existingImages.length === 0 && index === 0,
        }))

        const { error: imagesInsertError } = await supabase.from('product_images').insert(imageRecords)
        if (imagesInsertError) throw imagesInsertError
      }

      router.push('/urunler')
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(error.message || 'Ürün güncellenirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const totalImages = existingImages.length + newImages.length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/urunler">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Ürün Düzenle</h1>
      </div>

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
              {/* Existing images */}
              {existingImages.map((image, index) => (
                <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={image.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(image.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {image.is_primary && (
                    <span className="absolute bottom-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">
                      Ana Görsel
                    </span>
                  )}
                </div>
              ))}
              
              {/* New image previews */}
              {newImagePreviews.map((preview, index) => (
                <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-green-500">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Yeni
                  </span>
                </div>
              ))}
              
              {totalImages < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Görsel Ekle</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleNewImageChange}
                  />
                </label>
              )}
            </div>
            <p className="text-sm text-gray-500">
              En fazla 5 görsel yükleyebilirsiniz. ({totalImages}/5)
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
                placeholder="Arama sonuçlarında görünecek açıklama"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/urunler">
            <Button variant="outline" type="button">İptal</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Değişiklikleri Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}
