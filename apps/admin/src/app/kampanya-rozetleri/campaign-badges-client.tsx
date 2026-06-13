'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, PageHeader } from '@novagross/ui'
import { Plus, Edit, Trash2, Loader2, X, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

type CampaignBadge = {
  id: string
  title: string
  icon: string
  bg_color: string
  link: string
  sort_order: number
  is_active: boolean
}

export function CampaignBadgesClient() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [items, setItems] = useState<CampaignBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    icon: 'ti-tag',
    bg_color: '#FF6000',
    link: '/',
    sort_order: '0',
    is_active: true,
  })

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('campaign_badges')
      .select('id, title, icon, bg_color, link, sort_order, is_active')
      .order('sort_order', { ascending: true })

    if (!error && data) setItems(data as CampaignBadge[])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ title: '', icon: 'ti-tag', bg_color: '#FF6000', link: '/', sort_order: '0', is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const onEdit = (b: CampaignBadge) => {
    setForm({
      title: b.title,
      icon: b.icon,
      bg_color: b.bg_color,
      link: b.link,
      sort_order: String(b.sort_order ?? 0),
      is_active: Boolean(b.is_active),
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
        icon: form.icon.trim(),
        bg_color: form.bg_color.trim(),
        link: form.link.trim(),
        sort_order: Number.parseInt(form.sort_order, 10) || 0,
        is_active: Boolean(form.is_active),
      }

      if (!payload.title) { alert('Başlık zorunlu.'); return }

      if (editingId) {
        const { error } = await (supabase as any).from('campaign_badges').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('campaign_badges').insert(payload)
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
    if (!confirm('Bu rozeti silmek istediğinize emin misiniz?')) return
    const { error } = await (supabase as any).from('campaign_badges').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await (supabase as any).from('campaign_badges').update({ is_active: !isActive }).eq('id', id)
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
        title="Kampanya Rozetleri"
        description="Ana sayfadaki Trendyol tarzı rozet şeridini yönet"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Rozet
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Rozet Düzenle' : 'Yeni Rozet Ekle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlık *</label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">İkon (Tabler CSS class)</label>
                  <Input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="ti-tag" />
                  <p className="text-xs text-muted-foreground mt-1">Örn: ti-tag, ti-truck, ti-bolt, ti-star</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Arka Plan Rengi</label>
                  <div className="flex gap-2">
                    <Input type="color" value={form.bg_color} onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))} className="w-14 p-1 h-10" />
                    <Input value={form.bg_color} onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))} placeholder="#FF6000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Link</label>
                  <Input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="/kampanyalar" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sıra</label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} />
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
        <CardHeader><CardTitle>Mevcut Rozetler</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz rozet yok.</p>
          ) : (
            <div className="space-y-3">
              {items.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0" style={{ backgroundColor: b.bg_color }}>
                      <i className={`ti ${b.icon}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.title}</span>
                        {!b.is_active && <Badge variant="secondary">Pasif</Badge>}
                        <span className="text-xs text-muted-foreground">#{b.sort_order}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{b.icon} · {b.link}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(b.id, b.is_active)}>
                      {b.is_active ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(b)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(b.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
