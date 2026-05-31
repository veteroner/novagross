'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Badge, Input, Label, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Megaphone,
  Power,
  ExternalLink,
  Copy,
  Percent,
  Wallet,
  Gift,
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
  auto_title: string | null
  public_slug: string | null
  discount_type: 'percentage' | 'fixed' | 'bogo'
  discount_value: number | null
  buy_quantity: number | null
  get_quantity: number | null
  min_order_amount: number | null
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  target_type: 'all_products' | 'specific_products' | 'category'
  product_ids: string[] | null
  category_ids: string[] | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string | null
}

const EMPTY: CampaignInput = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  buy_quantity: 2,
  get_quantity: 1,
  min_order_amount: null,
  max_discount: null,
  usage_limit: null,
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

function discountTypeLabel(c: { discount_type: string }) {
  if (c.discount_type === 'percentage') return 'Sepette % indirimi'
  if (c.discount_type === 'fixed') return 'Sepette TL indirimi'
  if (c.discount_type === 'bogo') return 'Sepette X al Y öde indirimi'
  return c.discount_type
}

function discountTypeIcon(t: string) {
  if (t === 'percentage') return Percent
  if (t === 'fixed') return Wallet
  return Gift
}

function discountSummary(c: CampaignRow | CampaignInput) {
  if (c.discount_type === 'percentage')
    return `%${Number(c.discount_value ?? 0).toFixed(0)} indirim`
  if (c.discount_type === 'fixed')
    return `${Number(c.discount_value ?? 0).toFixed(2)} ₺ indirim`
  return `${c.buy_quantity} al ${c.get_quantity} öde`
}

type Filter = 'all' | 'active' | 'expired' | 'inactive'

export function CampaignsClient({
  campaigns,
  products,
  categories,
  publicBaseUrl,
}: {
  campaigns: CampaignRow[]
  products: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  publicBaseUrl: string
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')

  const now = Date.now()
  const matchesFilter = (c: CampaignRow): boolean => {
    const expired = c.ends_at ? new Date(c.ends_at).getTime() < now : false
    const notStarted = c.starts_at ? new Date(c.starts_at).getTime() > now : false
    const active = c.is_active && !expired && !notStarted
    if (filter === 'all') return true
    if (filter === 'active') return active
    if (filter === 'expired') return expired
    if (filter === 'inactive') return !c.is_active && !expired
    return true
  }

  const filtered = campaigns.filter(matchesFilter)

  const counts = {
    all: campaigns.length,
    active: campaigns.filter((c) => matchesFilter.call(null, c) && c.is_active).length,
    expired: campaigns.filter((c) => c.ends_at && new Date(c.ends_at).getTime() < now).length,
    inactive: campaigns.filter((c) => !c.is_active).length,
  }

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
      discount_value: c.discount_value ?? 10,
      buy_quantity: c.buy_quantity ?? 2,
      get_quantity: c.get_quantity ?? 1,
      min_order_amount: c.min_order_amount,
      max_discount: c.max_discount,
      usage_limit: c.usage_limit,
      target_type: c.target_type,
      product_ids: c.product_ids ?? [],
      category_ids: c.category_ids ?? [],
      starts_at: toLocal(c.starts_at),
      ends_at: toLocal(c.ends_at),
      is_active: c.is_active,
      public_slug: c.public_slug ?? '',
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

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: counts.all },
    { key: 'active', label: 'Devam Eden', count: counts.active },
    { key: 'expired', label: 'Süresi Doldu', count: counts.expired },
    { key: 'inactive', label: 'Pasif', count: counts.inactive },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kampanyalar"
        description="Mağazanıza özel sepet indirimleri ve BOGO kampanyaları"
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
              <Label htmlFor="discount_type">Kampanya Tipi *</Label>
              <select
                id="discount_type"
                value={form.discount_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_type: e.target.value as 'percentage' | 'fixed' | 'bogo',
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="percentage">Sepette % indirimi</option>
                <option value="fixed">Sepette TL indirimi</option>
                <option value="bogo">Sepette X al Y öde indirimi (BOGO)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="name">Kampanya Adı (dahili) *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Yaz kampanyası"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="public_slug">
                Public URL <span className="text-gray-400 text-xs">(boş bırak → otomatik)</span>
              </Label>
              <Input
                id="public_slug"
                value={form.public_slug ?? ''}
                onChange={(e) => setForm({ ...form, public_slug: e.target.value })}
                placeholder="yaz-kampanyasi"
                disabled={isPending}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Açıklama (dahili)</Label>
              <Input
                id="description"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opsiyonel — dahili not"
                disabled={isPending}
              />
            </div>

            {/* Discount fields */}
            {form.discount_type !== 'bogo' && (
              <>
                <div>
                  <Label htmlFor="discount_value">
                    İndirim Değeri * {form.discount_type === 'percentage' ? '(%)' : '(₺)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discount_value ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, discount_value: Number(e.target.value) })
                    }
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="min_order_amount">Minimum Sepet Tutarı (₺)</Label>
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
                {form.discount_type === 'percentage' && (
                  <div className="md:col-span-2">
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
                      placeholder="Limitsiz — yüzde indirim için tavan"
                      disabled={isPending}
                    />
                  </div>
                )}
              </>
            )}

            {form.discount_type === 'bogo' && (
              <>
                <div>
                  <Label htmlFor="buy_quantity">Al miktarı *</Label>
                  <Input
                    id="buy_quantity"
                    type="number"
                    min="2"
                    value={form.buy_quantity ?? 2}
                    onChange={(e) => setForm({ ...form, buy_quantity: Number(e.target.value) })}
                    required
                    disabled={isPending}
                  />
                </div>
                <div>
                  <Label htmlFor="get_quantity">Öde miktarı *</Label>
                  <Input
                    id="get_quantity"
                    type="number"
                    min="1"
                    value={form.get_quantity ?? 1}
                    onChange={(e) => setForm({ ...form, get_quantity: Number(e.target.value) })}
                    required
                    disabled={isPending}
                  />
                </div>
                <p className="md:col-span-2 text-xs text-gray-500">
                  Örn: <strong>3 al 2 öde</strong> — müşteri 3 ürün alır, en ucuz 1 tanesi bedava.
                </p>
              </>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="usage_limit">
                Kampanya limiti <span className="text-gray-400 text-xs">(toplam sipariş)</span>
              </Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                value={form.usage_limit ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usage_limit: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Limitsiz"
                disabled={isPending}
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

      <TabBar items={tabs} value={filter} onChange={(k) => setFilter(k as Filter)} />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="Kampanya yok"
            description={
              filter === 'all'
                ? 'Mağazanıza özel kampanya oluşturarak satışlarınızı artırın.'
                : 'Bu durumda kampanya yok.'
            }
            action={
              filter === 'all' ? (
                <Button
                  onClick={startNew}
                  style={{ backgroundColor: '#16A34A' }}
                  className="text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Kampanyayı Oluştur
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Kampanya tipi</th>
                  <th className="text-left py-3 px-4 font-medium">Adı</th>
                  <th className="text-left py-3 px-4 font-medium">Tanımı</th>
                  <th className="text-left py-3 px-4 font-medium">Başlangıç</th>
                  <th className="text-left py-3 px-4 font-medium">Bitiş</th>
                  <th className="text-left py-3 px-4 font-medium">Limit</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const expired = c.ends_at ? new Date(c.ends_at).getTime() < now : false
                  const notStarted = c.starts_at
                    ? new Date(c.starts_at).getTime() > now
                    : false
                  const exhausted =
                    c.usage_limit != null && c.used_count >= c.usage_limit
                  const Icon = discountTypeIcon(c.discount_type)
                  const publicUrl = c.public_slug ? `${publicBaseUrl}/kampanyalar/${c.public_slug}` : null
                  return (
                    <tr key={c.id} className="border-b hover:bg-green-50/30 align-top">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-gray-700">
                            {discountTypeLabel(c)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{discountSummary(c)}</div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        {publicUrl ? (
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-700 hover:underline text-sm flex items-center gap-1"
                          >
                            <span className="truncate">{c.auto_title ?? c.name}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-700">
                            {c.auto_title ?? c.name}
                          </span>
                        )}
                        {publicUrl && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(publicUrl)}
                            className="text-xs text-gray-500 hover:text-green-700 flex items-center gap-1 mt-0.5"
                          >
                            <Copy className="h-3 w-3" />
                            URL kopyala
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                        {formatDate(c.starts_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                        {formatDate(c.ends_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {c.usage_limit ? (
                          <span>
                            {c.used_count}/{c.usage_limit} sipariş
                          </span>
                        ) : (
                          <span className="text-gray-400">Sınırsız</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!c.is_active ? (
                          <Badge variant="secondary">Pasif</Badge>
                        ) : expired ? (
                          <Badge variant="destructive">Süresi doldu</Badge>
                        ) : exhausted ? (
                          <Badge variant="destructive">Limite ulaşıldı</Badge>
                        ) : notStarted ? (
                          <Badge variant="secondary">Bekliyor</Badge>
                        ) : (
                          <Badge variant="success">Devam ediyor</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggle(c)}
                            title={c.is_active ? 'Sonlandır' : 'Aktifleştir'}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(c)}
                            title="Detay / Düzenle"
                          >
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
