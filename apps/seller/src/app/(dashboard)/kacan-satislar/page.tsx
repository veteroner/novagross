'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, Button } from '@novagross/ui'
import { Eye, ShoppingCart, Heart, Users, TrendingDown, Gift, Loader2, CheckCircle } from 'lucide-react'

interface InterestRow {
  product_id: string
  name: string
  slug: string
  price: number
  views: number
  cart_adds: number
  favorites: number
  interested_users: number
  abandoned_users: number
  purchases: number
}

interface OfferRow {
  product_id: string
  created_at: string
  recipient_count: number
  discount_value: number
}

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

export default function KacanSatislarPage() {
  const [rows, setRows] = useState<InterestRow[]>([])
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Teklif formu durumu
  const [formFor, setFormFor] = useState<string | null>(null)
  const [discount, setDiscount] = useState('10')
  const [audience, setAudience] = useState<'interested' | 'abandoned_cart' | 'favorited'>('abandoned_cart')
  const [validDays, setValidDays] = useState('7')
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/insights/product-interest')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Veri alınamadı')
      setRows(data.products || [])
      setOffers(data.offers || [])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const lastOfferFor = (productId: string): OfferRow | undefined =>
    offers.find((o) => o.product_id === productId)

  const inCooldown = (productId: string): boolean => {
    const o = lastOfferFor(productId)
    return !!o && Date.now() - new Date(o.created_at).getTime() < COOLDOWN_MS
  }

  const sendOffer = async (productId: string) => {
    setSending(true)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          discountValue: Number(discount),
          audience,
          validDays: Number(validDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Teklif gönderilemedi')
      setSuccessMsg(`✅ Teklif ${data.recipientCount} müşteriye gönderildi (e-posta + bildirim).`)
      setFormFor(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  // İlgi görmüş ama satışı düşük ürünleri öne çıkar
  const interesting = rows.filter((r) => r.views > 0 || r.cart_adds > 0 || r.favorites > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kaçan Satışlar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Son 30 günde ürünlerinizle ilgilenen ama satın almayan müşteriler. Onlara özel indirim
          göndererek satışa çevirin. Kimlik bilgileri gizlidir — teklif platform üzerinden iletilir.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg border border-green-300 bg-green-50 text-green-800 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card><CardContent className="py-8 text-center text-red-600">{error}</CardContent></Card>
      ) : interesting.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Son 30 günde henüz ürün ilgisi verisi yok.
            <p className="text-xs mt-2">Müşteriler ürünlerinizi görüntüledikçe burada görünecek.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interesting.map((r) => {
            const last = lastOfferFor(r.product_id)
            const cooling = inCooldown(r.product_id)
            return (
              <Card key={r.product_id}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{r.name}</p>
                      <p className="text-xs text-gray-500">₺{Number(r.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1" title="Görüntülenme"><Eye className="h-4 w-4" /> {r.views}</span>
                      <span className="flex items-center gap-1" title="Sepete eklenme"><ShoppingCart className="h-4 w-4" /> {r.cart_adds}</span>
                      <span className="flex items-center gap-1" title="Favori"><Heart className="h-4 w-4" /> {r.favorites}</span>
                      <span className="flex items-center gap-1 text-orange-600 font-medium" title="Sepette bırakan (satın almamış) üye">
                        <Users className="h-4 w-4" /> {r.abandoned_users} vazgeçen
                      </span>
                      <span className="text-green-700" title="Satış (30 gün)">✅ {r.purchases} satış</span>
                    </div>
                    <div>
                      {cooling ? (
                        <span className="text-xs text-gray-400">
                          Teklif gönderildi ({last?.recipient_count} kişi, %{last?.discount_value}) — 3 gün beklemede
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => { setFormFor(formFor === r.product_id ? null : r.product_id); setSuccessMsg(null) }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Gift className="h-4 w-4 mr-1" /> Teklif Gönder
                        </Button>
                      )}
                    </div>
                  </div>

                  {formFor === r.product_id && (
                    <div className="mt-4 p-4 rounded-lg border bg-orange-50/50 grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">İndirim (%)</label>
                        <input
                          type="number" min={5} max={90} value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Hedef Kitle</label>
                        <select
                          value={audience}
                          onChange={(e) => setAudience(e.target.value as any)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="abandoned_cart">Sepette bırakanlar</option>
                          <option value="interested">Tüm ilgilenenler</option>
                          <option value="favorited">Favorileyenler</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Geçerlilik (gün)</label>
                        <input
                          type="number" min={1} max={30} value={validDays}
                          onChange={(e) => setValidDays(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button size="sm" onClick={() => sendOffer(r.product_id)} disabled={sending} className="w-full">
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gönder'}
                        </Button>
                      </div>
                      <p className="sm:col-span-4 text-[11px] text-gray-500">
                        Her alıcıya kişiye özel tek kullanımlık kupon kodu üretilir; e-posta ve site içi
                        bildirim platform tarafından gönderilir. Aynı ürüne 3 günde bir teklif gönderebilirsiniz.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
