'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Input, Label } from '@novagross/ui'
import { Loader2, Gift } from 'lucide-react'
import { createPlatformOffer, type PlatformOfferInput } from './actions'

type Store = { id: string; name: string }

const OFFER_TYPES = [
  {
    value: 'commission_discount',
    label: 'Komisyon İndirimi',
    desc: 'Platform komisyonundan indirim sağla.',
  },
  {
    value: 'co_funded_discount',
    label: 'Ortak Finansman İndirim',
    desc: 'Platform indirimin bir kısmını üstlenir.',
  },
  {
    value: 'free_shipping_support',
    label: 'Ücretsiz Kargo Desteği',
    desc: 'Platform kargo ücretinin bir kısmını karşılar.',
  },
  {
    value: 'fee_waiver',
    label: 'İşlem Ücreti Muafiyeti',
    desc: 'Belirli süreyle işlem ücretleri kaldırılır.',
  },
] as const

export function OfferForm({ stores }: { stores: Store[] }) {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  const oneMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const [form, setForm] = useState<PlatformOfferInput>({
    store_id: null,
    title: '',
    description: '',
    offer_type: 'commission_discount',
    platform_share_percent: 5,
    platform_share_amount: null,
    required_seller_discount_percent: 10,
    required_min_stock: 1,
    product_ids: [],
    category_ids: [],
    ends_at: new Date(oneMonth).toISOString(),
    response_deadline: new Date(tomorrow).toISOString(),
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await createPlatformOffer(form)
        setSuccess(true)
        setForm({ ...form, title: '', description: '' })
      } catch (err: any) {
        setError(err?.message ?? 'Teklif gönderilemedi.')
      }
    })
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-orange-600" />
        Yeni Platform Teklifi Gönder
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="store">Hedef Satıcı</Label>
          <select
            id="store"
            value={form.store_id ?? ''}
            onChange={(e) =>
              setForm({ ...form, store_id: e.target.value || null })
            }
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            disabled={isPending}
          >
            <option value="">Tüm satıcılara (genel)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="title">Başlık</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Örn: Yaz kampanyası için %5 komisyon indirimi"
            required
            disabled={isPending}
          />
        </div>

        <div>
          <Label htmlFor="desc">Açıklama</Label>
          <textarea
            id="desc"
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Teklif detaylarını açıklayın..."
            disabled={isPending}
          />
        </div>

        <div>
          <Label>Teklif Tipi</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            {OFFER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, offer_type: t.value as any })}
                className={`text-left p-3 rounded-md border transition ${
                  form.offer_type === t.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isPending}
              >
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="share_percent">Platform Payı %</Label>
            <Input
              id="share_percent"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.platform_share_percent ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  platform_share_percent: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="seller_discount">Satıcı İndirimi %</Label>
            <Input
              id="seller_discount"
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.required_seller_discount_percent ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  required_seller_discount_percent: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="min_stock">Minimum Stok</Label>
            <Input
              id="min_stock"
              type="number"
              min="0"
              step="1"
              value={form.required_min_stock}
              onChange={(e) =>
                setForm({ ...form, required_min_stock: Number(e.target.value) })
              }
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deadline">Cevap Son Tarihi</Label>
            <Input
              id="deadline"
              type="date"
              value={form.response_deadline?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  response_deadline: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="ends">Teklif Bitiş Tarihi *</Label>
            <Input
              id="ends"
              type="date"
              value={form.ends_at.slice(0, 10)}
              onChange={(e) =>
                setForm({
                  ...form,
                  ends_at: new Date(e.target.value).toISOString(),
                })
              }
              required
              disabled={isPending}
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            Teklif gönderildi.
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: '#FF6000' }}
            className="text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Teklif Gönder
          </Button>
        </div>
      </form>
    </Card>
  )
}
