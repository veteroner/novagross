'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, PageHeader } from '@novagross/ui'
import { Plus, Edit, Trash2, Loader2, X, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

type PromoSection = {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  bg_color: string
  link: string
  position: number
  is_active: boolean
}

export function PromoGridClient() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [items, setItems] = useState<PromoSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    bg_color: '#F3F4F6',
    link: '/',
    position: '1',
    is_active: true,
  })

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('promo_sections')
      .select('id, title, subtitle, image_url, bg_color, link, position, is_active')
      .order('position', { ascending: true })

    if (!error && data) setItems(data as PromoSection[])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ title: '', subtitle: '', image_url: '', bg_color: '#F3F4F6', link: '/', position: '1', is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const onEdit = (s: PromoSection) => {
    setForm({
      title: s.title,
      subtitle: s.subtitle ?? '',
      image_url: s.image_url ?? '',
      bg_color: s.bg_color,
      link: s.link,
      position: String(s.position ?? 1),
      is_active: Boolean(s.is_active),
    })
    setEditingId(s.id)
    setShowForm(true)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image_url: form.image_url.trim() || null,
        bg_color: form.bg_color.trim(),
        link: form.link.trim(),
        position: Number.parseInt(form.position, 10) || 1,
        is_active: Boolean(form.is_active),
      }

      if (!payload.title) { alert('Başlık zorunlu.'); return }

      if (editingId) {
        const { error } = await (supabase as any).from('promo_sections').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('promo_sections').insert(payload)
        if (error) throw error
      }

      await fetchItems()
      resetForm()
    } catch (error: any) {
      alert(error?.message || 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Bu promo kartı silmek istediğinize emin misiniz?')) return
    const { error } = await (supabase as any).from('promo_sections').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await (supabase as any).from('promo_sections').update({ is_active: !isActive }).eq('id', id)
    if (!error) setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active: !isActive } : x)))
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
        title="Promo Grid"
        description="Ana sayfadaki 4-kutu Amazon tarzı promo kartları yönet (maks 4 kart)"
        actions={
          <Button onClick={() => setShowForm(true)} disabled={items.length >= 4}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kart
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Kart Düzenle' : 'Yeni Promo Kartı Ekle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alt Başlık</label>
                  <Input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Keşfet" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Görsel URL</label>
                <Input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." />
                <p className="text-xs text-muted-foreground mt-1">Unsplash, Supabase Storage veya harici URL</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Arka Plan Rengi</label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.bg_color} onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))} className="w-14 p-1 h-10" />
                    <Input value={form.bg_color} onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))} placeholder="#F3F4F6" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Link</label>
                  <Input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="/kategori/elektronik" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pozisyon (1-4)</label>
                  <Input type="number" min="1" max="4" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
                <span>Aktif</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>İptal</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mevcut Kartlar ({items.length}/4)</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz kart yok.</p>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border" style={{ backgroundColor: s.bg_color }}>
                      {s.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image_url} alt={s.title} className="w-full h-full object-cover opacity-70" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.title}</span>
                        {!s.is_active && <Badge variant="secondary">Pasif</Badge>}
                        <span className="text-xs text-muted-foreground">#{s.position}</span>
                      </div>
                      {s.subtitle && <div className="text-xs text-muted-foreground">{s.subtitle}</div>}
                      <div className="text-xs text-muted-foreground">{s.link}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(s.id, s.is_active)}>
                      {s.is_active ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(s)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
