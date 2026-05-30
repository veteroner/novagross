'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Badge, Input, Label, PageHeader, EmptyState } from '@novagross/ui'
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Percent,
  Tag,
  Power,
  Truck,
} from 'lucide-react'
import {
  createCoupon,
  updateCoupon,
  toggleCouponActive,
  deleteCoupon,
  type CouponInput,
} from './actions'

export type CouponRow = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_amount: number | null
  maximum_discount: number | null
  usage_limit: number | null
  used_count: number
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  free_shipping: boolean
  created_at: string | null
}

const EMPTY_FORM: CouponInput = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  minimum_amount: null,
  maximum_discount: null,
  usage_limit: null,
  starts_at: null,
  expires_at: null,
  is_active: true,
  free_shipping: false,
}

function toLocalDateTimeInput(iso: string | null): string {
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

function formatDiscount(c: CouponRow) {
  if (c.discount_type === 'percentage') {
    return `%${Number(c.discount_value).toFixed(0)}`
  }
  return `${Number(c.discount_value).toFixed(2)} ₺`
}

export function CouponsClient({ coupons }: { coupons: CouponRow[] }) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CouponInput>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const startNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setOpen(true)
  }

  const startEdit = (c: CouponRow) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      description: c.description ?? '',
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      minimum_amount: c.minimum_amount,
      maximum_discount: c.maximum_discount,
      usage_limit: c.usage_limit,
      starts_at: toLocalDateTimeInput(c.starts_at),
      expires_at: toLocalDateTimeInput(c.expires_at),
      is_active: c.is_active,
      free_shipping: c.free_shipping,
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
    const payload: CouponInput = {
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    startTransition(async () => {
      try {
        if (editingId) {
          await updateCoupon(editingId, payload)
        } else {
          await createCoupon(payload)
        }
        close()
      } catch (err: any) {
        setError(err?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  const onToggle = (c: CouponRow) => {
    startTransition(async () => {
      try {
        await toggleCouponActive(c.id, !c.is_active)
      } catch (err: any) {
        alert(err?.message ?? 'İşlem başarısız.')
      }
    })
  }

  const onDelete = (c: CouponRow) => {
    if (!confirm(`"${c.code}" kuponunu silmek istediğine emin misin?`)) return
    startTransition(async () => {
      try {
        await deleteCoupon(c.id)
      } catch (err: any) {
        alert(err?.message ?? 'Silinemedi.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kuponlar"
        description={`${coupons.length} kupon · Yüzde, sabit veya ücretsiz kargo`}
        actions={
          !open ? (
            <Button onClick={startNew}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kupon
            </Button>
          ) : null
        }
      />

      {open && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Kuponu Düzenle' : 'Yeni Kupon Oluştur'}
            </h2>
            <Button variant="ghost" size="sm" onClick={close} disabled={isPending}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kupon Kodu *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ÖRN: HOSGELDIN10"
                required
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="İsteğe bağlı"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="discount_type">İndirim Tipi *</Label>
              <select
                id="discount_type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.discount_type}
                onChange={(e) =>
                  setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })
                }
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
                onChange={(e) =>
                  setForm({ ...form, discount_value: Number(e.target.value) })
                }
                required
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="minimum_amount">Minimum Sepet Tutarı (₺)</Label>
              <Input
                id="minimum_amount"
                type="number"
                step="0.01"
                min="0"
                value={form.minimum_amount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minimum_amount: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Limitsiz"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="maximum_discount">
                Maksimum İndirim (₺){' '}
                <span className="text-xs text-gray-500">— yüzde için tavan</span>
              </Label>
              <Input
                id="maximum_discount"
                type="number"
                step="0.01"
                min="0"
                value={form.maximum_discount ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maximum_discount: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="Limitsiz"
                disabled={isPending || form.discount_type === 'fixed'}
              />
            </div>

            <div>
              <Label htmlFor="usage_limit">Toplam Kullanım Limiti</Label>
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
                placeholder="Sınırsız"
                disabled={isPending}
              />
            </div>

            <div></div>

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
              <Label htmlFor="expires_at">Bitiş</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={form.expires_at ?? ''}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center gap-2">
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

            <div className="flex items-center gap-2">
              <input
                id="free_shipping"
                type="checkbox"
                className="h-4 w-4"
                checked={form.free_shipping ?? false}
                onChange={(e) => setForm({ ...form, free_shipping: e.target.checked })}
                disabled={isPending}
              />
              <Label htmlFor="free_shipping" className="flex items-center gap-1">
                <Truck className="h-3 w-3" /> Ücretsiz Kargo
              </Label>
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
              <Button type="submit" disabled={isPending}>
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Kod</th>
                <th className="text-left py-3 px-4 font-medium">İndirim</th>
                <th className="text-left py-3 px-4 font-medium">Min. Sepet</th>
                <th className="text-left py-3 px-4 font-medium">Kullanım</th>
                <th className="text-left py-3 px-4 font-medium">Geçerlilik</th>
                <th className="text-left py-3 px-4 font-medium">Durum</th>
                <th className="text-right py-3 px-4 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      compact
                      icon={Tag}
                      title="Henüz kupon yok"
                      description={'"Yeni Kupon" ile ilk kuponunu oluştur.'}
                    />
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = c.expires_at
                    ? new Date(c.expires_at).getTime() < Date.now()
                    : false
                  const exhausted =
                    c.usage_limit != null && c.used_count >= c.usage_limit
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold">{c.code}</div>
                        {c.description && (
                          <div className="text-xs text-gray-500">{c.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-medium">
                          <Percent className="h-3 w-3 text-gray-400" />
                          {formatDiscount(c)}
                        </div>
                        {c.free_shipping && (
                          <Badge variant="secondary" className="mt-1">
                            <Truck className="h-3 w-3 mr-1" />
                            Ücretsiz Kargo
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.minimum_amount ? `${Number(c.minimum_amount).toFixed(2)} ₺` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span>{c.used_count}</span>
                        <span className="text-gray-400">
                          {' '}
                          / {c.usage_limit ?? '∞'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <div>{formatDate(c.starts_at)}</div>
                        <div className="text-gray-500">→ {formatDate(c.expires_at)}</div>
                      </td>
                      <td className="py-3 px-4">
                        {!c.is_active ? (
                          <Badge variant="secondary">Pasif</Badge>
                        ) : expired ? (
                          <Badge variant="destructive">Süresi Doldu</Badge>
                        ) : exhausted ? (
                          <Badge variant="destructive">Tükendi</Badge>
                        ) : (
                          <Badge variant="success">Aktif</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggle(c)}
                            disabled={isPending}
                            title={c.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(c)}
                            disabled={isPending}
                            title="Düzenle"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => onDelete(c)}
                            disabled={isPending}
                            title="Sil"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
