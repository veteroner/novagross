'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, PageHeader } from '@novagross/ui'
import { Plus, Edit, Trash2, Loader2, X, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

type BannerLinkType = 'product' | 'category' | 'page' | 'external'

type Banner = {
  id: string
  title: string
  description: string | null
  image_url: string
  link_type: BannerLinkType
  link_value: string
  button_text: string
  sort_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function BannersClient() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [items, setItems] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_type: 'category' as BannerLinkType,
    link_value: '',
    button_text: 'İncele',
    sort_order: '0',
    is_active: true,
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    fetchBanners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchBanners = async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('banners')
      .select(
        'id, title, description, image_url, link_type, link_value, button_text, sort_order, is_active, start_date, end_date'
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error && data) setItems(data as Banner[])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      image_url: '',
      link_type: 'category',
      link_value: '',
      button_text: 'İncele',
      sort_order: '0',
      is_active: true,
      start_date: '',
      end_date: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const onEdit = (b: Banner) => {
    setForm({
      title: b.title,
      description: b.description ?? '',
      image_url: b.image_url,
      link_type: b.link_type,
      link_value: b.link_value,
      button_text: b.button_text ?? 'İncele',
      sort_order: String(b.sort_order ?? 0),
      is_active: Boolean(b.is_active),
      start_date: b.start_date ?? '',
      end_date: b.end_date ?? '',
    })
    setEditingId(b.id)
    setShowForm(true)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim(),
        link_type: form.link_type,
        link_value: form.link_value.trim(),
        button_text: form.button_text.trim() || 'İncele',
        sort_order: Number.parseInt(form.sort_order, 10) || 0,
        is_active: Boolean(form.is_active),
        start_date: toIsoOrNull(form.start_date),
        end_date: toIsoOrNull(form.end_date),
      }

      if (!payload.title || !payload.image_url || !payload.link_value) {
        alert('Lütfen başlık, görsel URL ve link değerini doldurun.')
        return
      }

      if (editingId) {
        const { error } = await (supabase as any)
          .from('banners')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('banners').insert(payload)
        if (error) throw error
      }

      await fetchBanners()
      resetForm()
    } catch (error: any) {
      console.error('Error saving banner:', error)
      alert(error?.message || 'Banner kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Bu bannerı silmek istediğinize emin misiniz?')) return

    const { error } = await (supabase as any).from('banners').delete().eq('id', id)

    if (error) {
      alert(error.message || 'Banner silinemedi')
      return
    }

    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await (supabase as any)
      .from('banners')
      .update({ is_active: !isActive })
      .eq('id', id)

    if (!error) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: !isActive } : x)))
    }
  }

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
        title="Bannerlar"
        description="Ana sayfa banner görsellerini yönet"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Banner
          </Button>
        }
      />

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Banner Düzenle' : 'Yeni Banner Ekle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Buton Metni</label>
                  <Input value={form.button_text} onChange={(e) => setForm((p) => ({ ...p, button_text: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border rounded-md"
                  placeholder="Opsiyonel"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Görsel URL *</label>
                  <Input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} required />
                  <p className="text-xs text-muted-foreground mt-1">Örn: Supabase Storage public URL</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sıra</label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Link Tipi *</label>
                  <select
                    value={form.link_type}
                    onChange={(e) => setForm((p) => ({ ...p, link_type: e.target.value as BannerLinkType }))}
                    className="w-full p-3 border rounded-md"
                  >
                    <option value="product">Ürün (slug)</option>
                    <option value="category">Kategori (slug)</option>
                    <option value="page">Sayfa (path)</option>
                    <option value="external">Harici (URL)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Link Değeri *</label>
                  <Input
                    value={form.link_value}
                    onChange={(e) => setForm((p) => ({ ...p, link_value: e.target.value }))}
                    placeholder={
                      form.link_type === 'product'
                        ? 'urun-slug'
                        : form.link_type === 'category'
                          ? 'kategori-slug'
                          : form.link_type === 'page'
                            ? '/kampanyalar'
                            : 'https://example.com'
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlangıç (ISO / tarih)</label>
                  <Input value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} placeholder="2026-02-04T00:00:00Z" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bitiş (ISO / tarih)</label>
                  <Input value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} placeholder="2026-12-31T23:59:59Z" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>Aktif</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mevcut Bannerlar</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz banner yok.</p>
          ) : (
            <div className="space-y-3">
              {items.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{b.title}</span>
                      {!b.is_active ? <Badge variant="secondary">Pasif</Badge> : null}
                      <span className="text-xs text-muted-foreground">#{b.sort_order}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {b.link_type}: {b.link_value}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(b.id, b.is_active)}
                      title={b.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {b.is_active ? (
                        <X className="h-4 w-4 text-red-500" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(b)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(b.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
