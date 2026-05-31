'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Badge, Input, Label, PageHeader, EmptyState } from '@novagross/ui'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Megaphone,
  Power,
} from 'lucide-react'
import {
  createCampaign,
  updateCampaign,
  toggleCampaignActive,
  deleteCampaign,
  type CampaignInput,
} from './actions'

export type CampaignRow = {
  id: string
  name: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  max_discount: number | null
  target_type: 'all_products' | 'specific_products' | 'category'
  product_ids: string[] | null
  category_ids: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string | null
}

export type ProductOption = { id: string; name: string }
export type CategoryOption = { id: string; name: string }

const EMPTY: CampaignInput = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: null,
  max_discount: null,
  target_type: 'all_products',
  product_ids: [],
  category_ids: [],
  starts_at: null,
  ends_at: null,
  is_active: true,
}

function toLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDiscount(c: CampaignRow | CampaignInput) {
  if (c.discount_type === 'percentage') return `%${Number(c.discount_value).toFixed(0)}`
  return `${Number(c.discount_value).toFixed(2)} ₺`
}

export function CampaignsClient({
  campaigns,
  products,
  categories,
}: {
  campaigns: CampaignRow[]
  products: ProductOption[]
  categories: CategoryOption[]
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const startNew = () => {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setOpen(true)
  }

  const startEdit = (c: CampaignRow) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      description: c.description ?? '',
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: c.min_order_amount,
      max_discount: c.max_discount,
      target_type: c.target_type,
      product_ids: c.product_ids ?? [],
      category_ids: c.category_ids ?? [],
      starts_at: toLocal(c.starts_at),
      ends_at: toLocal(c.ends_at),
      is_active: c.is_active,
    })
    setError(null)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setEditingId(null)
    setError(null)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload: CampaignInput = {
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    }
    startTransition(async () => {
      try {
        if (editingId) await updateCampaign(editingId, payload)
        else await createCampaign(payload)
        close()
      } catch (err: any) {
        setError(err?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  const onToggle = (c: CampaignRow) =>
    startTransition(async () => {
      try {
        await toggleCampaignActive(c.id, !c.is_active)
      } catch (err: any) {
        alert(err?.message ?? 'İşlem başarısız.')
      }
    })

  const onDelete = (c: CampaignRow) => {
    if (!confirm(`"${c.name}" kampanyasını silmek istediğine emin misin?`)) return
    startTransition(async () => {
      try {
        await deleteCampaign(c.id)
      } catch (err: any) {
        alert(err?.message ?? 'Silinemedi.')
      }
    })
  }

  const toggleProductId = (id: string) => {
    const list = form.product_ids ?? []
    setForm({
      ...form,
      product_ids: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    })
  }
  const toggleCategoryId = (id: string) => {
    const list = form.category_ids ?? []
    setForm({
      ...form,
      category_ids: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kampanyalar"
        description={`${campaigns.length} kampanya · Mağazanıza özel indirimleri yönetin`}
        actions={
          !open ? (
            <Button onClick={startNew} style={{ backgroundColor: '#16A34A' }} className="text-white">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kampanya
            </Button>
          ) : null
        }
      />

      {open && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}
            </h2>
            <Button variant="ghost" size="sm" onClick={close} disabled={isPending}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Kampanya Adı *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={isPending}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Müşterilere gösterilecek (opsiyonel)"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="discount_type">İndirim Tipi *</Label>
              <select
                id="discount_type"
                value={form.discount_type}
                onChange={(e) =>
                  setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="percentage">Yüzde (%)</option>
                <option value="fixed">Sabit Tutar (₺)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="discount_value">
                İndirim Değeri * {form.discount_type === 'percentage' ? '(%)' : '(₺)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                step="0.01"
                min="0"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                required
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="min_order_amount">Minimum Sepet (₺)</Label>
              <Input
                id="min_order_amount"
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_amount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    min_order_amount: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Limitsiz"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="max_discount">Maksimum İndirim (₺)</Label>
              <Input
                id="max_discount"
                type="number"
                step="0.01"
                min="0"
                value={form.max_discount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_discount: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Limitsiz"
                disabled={isPending || form.discount_type === 'fixed'}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="target_type">Hedef</Label>
              <select
                id="target_type"
                value={form.target_type}
                onChange={(e) =>
                  setForm({ ...form, target_type: e.target.value as CampaignInput['target_type'] })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="all_products">Tüm Ürünlerim</option>
                <option value="specific_products">Seçili Ürünler</option>
                <option value="category">Kategori</option>
              </select>
            </div>

            {form.target_type === 'specific_products' && (
              <div className="md:col-span-2">
                <Label>Ürün Seç ({form.product_ids?.length ?? 0} seçili)</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {products.length === 0 && (
                    <p className="text-sm text-gray-500">Mağazanızda ürün yok.</p>
                  )}
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={(form.product_ids ?? []).includes(p.id)}
                        onChange={() => toggleProductId(p.id)}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.target_type === 'category' && (
              <div className="md:col-span-2">
                <Label>Kategori Seç ({form.category_ids?.length ?? 0} seçili)</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={(form.category_ids ?? []).includes(c.id)}
                        onChange={() => toggleCategoryId(c.id)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="starts_at">Başlangıç</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at ?? ''}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="ends_at">Bitiş</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={form.ends_at ?? ''}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="is_active"
                type="checkbox"
                className="h-4 w-4"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                disabled={isPending}
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>

            {error && (
              <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ backgroundColor: '#16A34A' }}
                className="text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor…
                  </>
                ) : editingId ? (
                  'Güncelle'
                ) : (
                  'Oluştur'
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Henüz kampanya yok"
            description="Mağazanıza özel kampanya oluşturarak satışlarınızı artırın."
            action={
              <Button onClick={startNew} style={{ backgroundColor: '#16A34A' }} className="text-white">
                <Plus className="h-4 w-4 mr-2" />
                İlk Kampanyayı Oluştur
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const expired = c.ends_at ? new Date(c.ends_at).getTime() < Date.now() : false
            const notStarted = c.starts_at
              ? new Date(c.starts_at).getTime() > Date.now()
              : false
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                      {!c.is_active ? (
                        <Badge variant="secondary">Pasif</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">Süresi doldu</Badge>
                      ) : notStarted ? (
                        <Badge variant="secondary">Bekliyor</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-600 mb-2">{c.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="px-2 py-0.5 rounded font-semibold text-white"
                        style={{ backgroundColor: '#16A34A' }}
                      >
                        {formatDiscount(c)} indirim
                      </span>
                      <span className="text-xs text-gray-500">
                        {c.target_type === 'all_products'
                          ? 'Tüm ürünler'
                          : c.target_type === 'specific_products'
                          ? `${c.product_ids?.length ?? 0} ürün`
                          : `${c.category_ids?.length ?? 0} kategori`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Başlangıç: {formatDate(c.starts_at)}</span>
                      <span>Bitiş: {formatDate(c.ends_at)}</span>
                      {c.min_order_amount ? (
                        <span>
                          Min. sepet: {Number(c.min_order_amount).toFixed(2)} ₺
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggle(c)}
                      title={c.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                    >
                      <Power className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)} title="Düzenle">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete(c)}
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
