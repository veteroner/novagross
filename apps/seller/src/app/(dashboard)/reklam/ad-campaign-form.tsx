'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Input, Label, Badge } from '@novagross/ui'
import { Loader2, Megaphone, Plus, X } from 'lucide-react'
import { createAdCampaign, type AdCampaignInput } from './actions'

type Product = { id: string; name: string }
type Category = { id: string; name: string }

const AD_TYPES = [
  {
    value: 'sponsored_product',
    label: 'Sponsorlu Ürün',
    desc: 'Belirli ürünlerinizi arama ve kategori sonuçlarında üst sıralarda gösterin.',
  },
  {
    value: 'sponsored_brand',
    label: 'Sponsorlu Marka',
    desc: 'Marka kelimeniz için marka rozeti ile gösterin.',
  },
  {
    value: 'sponsored_category',
    label: 'Sponsorlu Kategori',
    desc: 'Seçtiğiniz kategorinin üst kısmında öne çıkarın.',
  },
] as const

export function AdCampaignForm({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const [form, setForm] = useState<AdCampaignInput>({
    name: '',
    ad_type: 'sponsored_product',
    product_ids: [],
    brand_keyword: '',
    daily_budget: 50,
    bid_per_click: 1.5,
    keywords: [],
    category_ids: [],
    starts_at: null,
    ends_at: null,
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const addKeyword = () => {
    const k = keywordInput.trim().toLowerCase()
    if (k && !form.keywords.includes(k)) {
      setForm({ ...form, keywords: [...form.keywords, k] })
      setKeywordInput('')
    }
  }
  const removeKeyword = (k: string) =>
    setForm({ ...form, keywords: form.keywords.filter((x) => x !== k) })

  const toggleProduct = (id: string) => {
    if (form.product_ids.includes(id)) {
      setForm({ ...form, product_ids: form.product_ids.filter((x) => x !== id) })
    } else if (form.product_ids.length < 20) {
      setForm({ ...form, product_ids: [...form.product_ids, id] })
    }
  }

  const toggleCategory = (id: string) => {
    if (form.category_ids.includes(id)) {
      setForm({ ...form, category_ids: form.category_ids.filter((x) => x !== id) })
    } else if (form.category_ids.length < 5) {
      setForm({ ...form, category_ids: [...form.category_ids, id] })
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await createAdCampaign(form)
        setSuccess(true)
        setForm({
          name: '',
          ad_type: 'sponsored_product',
          product_ids: [],
          brand_keyword: '',
          daily_budget: 50,
          bid_per_click: 1.5,
          keywords: [],
          category_ids: [],
          starts_at: null,
          ends_at: null,
        })
      } catch (err: any) {
        setError(err?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-green-600" />
        Yeni Reklam Kampanyası
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Kampanya Adı</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Örn: Yaz Kampanyası — Spor Ayakkabı"
            required
            disabled={isPending}
          />
        </div>

        <div>
          <Label>Reklam Tipi</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
            {AD_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, ad_type: t.value as any })}
                className={`text-left p-3 rounded-md border transition ${
                  form.ad_type === t.value
                    ? 'border-green-600 bg-green-50'
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

        {form.ad_type === 'sponsored_brand' && (
          <div>
            <Label htmlFor="brand">Marka Kelimesi</Label>
            <Input
              id="brand"
              value={form.brand_keyword ?? ''}
              onChange={(e) => setForm({ ...form, brand_keyword: e.target.value })}
              placeholder="Marka adınızı yazın"
              disabled={isPending}
            />
          </div>
        )}

        {(form.ad_type === 'sponsored_product' ||
          form.ad_type === 'sponsored_brand') && (
          <div>
            <Label>
              Reklamı Yapılacak Ürünler{' '}
              <span className="text-sm font-normal text-gray-500">
                ({form.product_ids.length} / 20)
              </span>
            </Label>
            <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-white">
              {products.length === 0 && (
                <p className="text-sm text-gray-500 p-2">Mağazanızda ürün yok.</p>
              )}
              {products.map((p) => {
                const checked = form.product_ids.includes(p.id)
                const disabled = !checked && form.product_ids.length >= 20
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || isPending}
                      onChange={() => toggleProduct(p.id)}
                    />
                    <span>{p.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {form.ad_type === 'sponsored_category' && (
          <div>
            <Label>
              Hedef Kategoriler{' '}
              <span className="text-sm font-normal text-gray-500">
                ({form.category_ids.length} / 5)
              </span>
            </Label>
            <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1 bg-white">
              {categories.map((c) => {
                const checked = form.category_ids.includes(c.id)
                const disabled = !checked && form.category_ids.length >= 5
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || isPending}
                      onChange={() => toggleCategory(c.id)}
                    />
                    <span>{c.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <Label>Hedef Anahtar Kelimeler (opsiyonel)</Label>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addKeyword()
                }
              }}
              placeholder="örn: spor ayakkabı"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addKeyword}
              disabled={isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.keywords.map((k) => (
                <Badge key={k} variant="secondary" className="gap-1">
                  {k}
                  <button
                    type="button"
                    onClick={() => removeKeyword(k)}
                    className="hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget">Günlük Bütçe (₺)</Label>
            <Input
              id="budget"
              type="number"
              min="1"
              step="1"
              value={form.daily_budget}
              onChange={(e) =>
                setForm({ ...form, daily_budget: Number(e.target.value) })
              }
              required
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="bid">Tıklama Başına Teklif (₺)</Label>
            <Input
              id="bid"
              type="number"
              min="0.1"
              step="0.1"
              value={form.bid_per_click}
              onChange={(e) =>
                setForm({ ...form, bid_per_click: Number(e.target.value) })
              }
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Başlangıç Tarihi (opsiyonel)</Label>
            <Input
              id="starts"
              type="date"
              value={form.starts_at?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="ends">Bitiş Tarihi (opsiyonel)</Label>
            <Input
              id="ends"
              type="date"
              value={form.ends_at?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
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
            Kampanya oluşturuldu — admin onayına gönderildi.
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: '#16A34A' }}
            className="text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Kampanya Oluştur
          </Button>
        </div>
      </form>
    </Card>
  )
}
