'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, PageHeader } from '@novagross/ui'
import { Plus, Edit, Trash2, Loader2, X, Check, FolderTree, Upload } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { validateImageUpload, safeUploadPath } from '@novagross/utils'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  parent?: { name: string } | null
  _count?: { products: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_id: '',
    sort_order: '0',
    is_active: true,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        parent_id,
        sort_order,
        is_active
      `)
      .order('sort_order')
      .order('name')

    if (!error && data) {
      // Get parent names
      const categoriesWithParent = data.map(cat => ({
        ...cat,
        parent: data.find(p => p.id === cat.parent_id) ? { name: data.find(p => p.id === cat.parent_id)!.name } : null
      }))
      setCategories(categoriesWithParent)
    }
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

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_id: '',
      sort_order: '0',
      is_active: true,
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      parent_id: category.parent_id || '',
      sort_order: category.sort_order.toString(),
      is_active: category.is_active,
    })
    setEditingId(category.id)
    setShowAddForm(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const v = validateImageUpload(file)
    if (!v.ok) {
      alert(v.error)
      return
    }
    setUploading(true)
    try {
      const fileName = safeUploadPath(`category-${editingId || 'new'}`, v.ext)
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: file.type, upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
      if (!urlData?.publicUrl) throw new Error('Public URL alınamadı')
      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err: any) {
      alert(err.message || 'Görsel yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        image_url: formData.image_url || null,
        parent_id: formData.parent_id || null,
        sort_order: parseInt(formData.sort_order),
        is_active: formData.is_active,
      }

      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({ ...categoryData, updated_at: new Date().toISOString() })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData)

        if (error) throw error
      }

      await fetchCategories()
      resetForm()
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert(error.message || 'Kategori kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (!error) {
      setCategories(categories.filter(c => c.id !== id))
    } else {
      alert('Kategori silinirken bir hata oluştu. Alt kategorileri veya ürünleri olabilir.')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !isActive })
      .eq('id', id)

    if (!error) {
      setCategories(categories.map(c => 
        c.id === id ? { ...c, is_active: !isActive } : c
      ))
    }
  }

  // Organize categories into a tree structure for display
  const rootCategories = categories.filter(c => !c.parent_id)
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategoriler"
        description="Ürün kategorilerini düzenle"
        actions={
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kategori
          </Button>
        }
      />

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori Adı *</label>
                  <Input
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Kategori adı"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Slug</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="kategori-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kategori açıklaması"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kategori Görseli</label>
                <div className="flex items-center gap-4">
                  {formData.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.image_url}
                      alt="Kategori görseli"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border flex items-center justify-center text-2xl text-gray-300 bg-gray-50">
                      📦
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? 'Yükleniyor…' : 'Görsel Yükle'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                      placeholder="veya görsel URL'si yapıştırın"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Üst Kategori</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    value={formData.parent_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                  >
                    <option value="">Ana Kategori</option>
                    {categories
                      .filter(c => c.id !== editingId)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sıra</label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Kategori Listesi ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz kategori eklenmemiş
            </div>
          ) : (
            <div className="space-y-2">
              {rootCategories.map(category => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  level={0}
                  getChildren={getChildren}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={toggleActive}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Recursive category item component
function CategoryItem({
  category,
  level,
  getChildren,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  category: Category
  level: number
  getChildren: (parentId: string) => Category[]
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
}) {
  const children = getChildren(category.id)

  return (
    <div>
      <div
        className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 ${
          level > 0 ? 'ml-6 border-l-2 border-gray-200' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {category.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={category.image_url} alt={category.name} className="h-9 w-9 rounded object-cover border" />
          ) : (
            <div className="h-9 w-9 rounded border flex items-center justify-center text-gray-300 bg-gray-50 text-sm">📦</div>
          )}
          <span className="font-medium">{category.name}</span>
          <span className="text-sm text-gray-500">/{category.slug}</span>
          {!category.is_active && (
            <Badge variant="secondary">Pasif</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(category.id, category.is_active)}
          >
            {category.is_active ? (
              <X className="h-4 w-4 text-red-500" />
            ) : (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      {children.map(child => (
        <CategoryItem
          key={child.id}
          category={child}
          level={level + 1}
          getChildren={getChildren}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  )
}
