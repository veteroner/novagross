'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, PageHeader } from '@novagross/ui'
import { Plus, Trash2, Loader2, Percent, X, Check } from 'lucide-react'
import { createCommissionCampaign, updateCommissionCampaign, deleteCommissionCampaign } from './actions'

type Category = { id: string; name: string }
type Campaign = {
  id: string
  name: string
  description: string | null
  discounted_commission_rate: number
  category_ids: string[] | null
  min_price: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  product_count: number
}

export function CommissionCampaignsClient({
  campaigns,
  categories,
}: {
  campaigns: Campaign[]
  categories: Category[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    discounted_commission_rate: '5',
    category_ids: [] as string[],
    min_price: '0',
    starts_at: '',
    ends_at: '',
    is_active: true,
  })

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id

  const toggleCat = (id: string) =>
    setForm((p) => ({
      ...p,
      category_ids: p.category_ids.includes(id)
        ? p.category_ids.filter((x) => x !== id)
        : [...p.category_ids, id],
    }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCommissionCampaign({
        name: form.name,
        description: form.description || null,
        discounted_commission_rate: Number(form.discounted_commission_rate),
        category_ids: form.category_ids,
        min_price: Number(form.min_price) || 0,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
      })
      setForm({ name: '', description: '', discounted_commission_rate: '5', category_ids: [], min_price: '0', starts_at: '', ends_at: '', is_active: true })
      setShowForm(false)
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setSaving(false)
    }
  }

  const onToggleActive = async (c: Campaign) => {
    try {
      await updateCommissionCampaign(c.id, { is_active: !c.is_active })
    } catch (e: any) {
      alert(e?.message || 'Hata')
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Bu komisyon kampanyasını silmek istediğinize emin misiniz?')) return
    try {
      await deleteCommissionCampaign(id)
    } catch (e: any) {
      alert(e?.message || 'Hata')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komisyon İndirimli Kampanyalar"
        description="Belirli kategorilerde komisyon oranını düşürün. Satıcılar ürünlerini bu kampanyalara ekleyerek indirimli komisyondan yararlanır."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Yeni Kampanya
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Yeni Komisyon Kampanyası</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kampanya Adı *</label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Örn: Elektronik %5 Komisyon" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">İndirimli Komisyon (%) *</label>
                  <Input type="number" step="0.5" min="0" max="50" value={form.discounted_commission_rate} onChange={(e) => setForm((p) => ({ ...p, discounted_commission_rate: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full p-3 border rounded-md" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hedef Kategoriler (boş = tüm kategoriler)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {categories.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleCat(c.id)}
                      className={`text-xs px-2 py-1 rounded-full border ${form.category_ids.includes(c.id) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min. Ürün Fiyatı (₺)</label>
                  <Input type="number" value={form.min_price} onChange={(e) => setForm((p) => ({ ...p, min_price: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Başlangıç</label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bitiş</label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Oluştur'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Kampanyalar</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz komisyon kampanyası yok.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />{Number(c.discounted_commission_rate)}
                      </Badge>
                      {!c.is_active && <Badge variant="secondary">Pasif</Badge>}
                      <span className="text-xs text-muted-foreground">{c.product_count} ürün katıldı</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {c.category_ids && c.category_ids.length > 0 ? c.category_ids.map(catName).join(', ') : 'Tüm kategoriler'}
                      {c.ends_at ? ` · Bitiş: ${new Date(c.ends_at).toLocaleDateString('tr-TR')}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onToggleActive(c)} title={c.is_active ? 'Pasif yap' : 'Aktif yap'}>
                      {c.is_active ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
