'use client'

import { useState } from 'react'
import { Card, Button, Badge } from '@novagross/ui'
import { Percent, Plus, X, Loader2 } from 'lucide-react'
import { joinCommissionCampaign, leaveCommissionCampaign } from './actions'

type Campaign = {
  id: string
  name: string
  description: string | null
  discounted_commission_rate: number
  category_ids: string[] | null
  min_price: number
  ends_at: string | null
}
type Product = { id: string; name: string; price: number; category_id: string | null }

function eligibleProducts(campaign: Campaign, products: Product[]) {
  return products.filter((p) => {
    if (campaign.min_price && Number(p.price) < Number(campaign.min_price)) return false
    if (campaign.category_ids && campaign.category_ids.length > 0) {
      return p.category_id ? campaign.category_ids.includes(p.category_id) : false
    }
    return true
  })
}

export function CommissionCampaignList({
  campaigns,
  products,
  joinedMap,
}: {
  campaigns: Campaign[]
  products: Product[]
  joinedMap: Record<string, string[]>
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const onJoin = async (campaignId: string) => {
    const ids = Object.keys(selected).filter((k) => selected[k])
    if (ids.length === 0) return alert('En az bir ürün seçin.')
    setBusy(true)
    try {
      await joinCommissionCampaign(campaignId, ids)
      setSelected({})
      setOpenId(null)
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setBusy(false)
    }
  }

  const onLeave = async (campaignId: string, productId: string) => {
    setBusy(true)
    try {
      await leaveCommissionCampaign(campaignId, productId)
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {campaigns.map((c) => {
        const joinedIds = joinedMap[c.id] ?? []
        const eligible = eligibleProducts(c, products)
        const notJoined = eligible.filter((p) => !joinedIds.includes(p.id))
        return (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />{Number(c.discounted_commission_rate)} komisyon
                  </Badge>
                </div>
                {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {c.min_price > 0 ? `Min. ürün fiyatı: ₺${Number(c.min_price)} · ` : ''}
                  {c.ends_at ? `Bitiş: ${new Date(c.ends_at).toLocaleDateString('tr-TR')}` : 'Süresiz'}
                  {` · ${joinedIds.length} ürününüz katıldı`}
                </p>
              </div>
              <Button onClick={() => setOpenId(openId === c.id ? null : c.id)} disabled={notJoined.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Ürün Ekle
              </Button>
            </div>

            {/* Katılan ürünler */}
            {joinedIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {joinedIds.map((pid) => {
                  const p = products.find((x) => x.id === pid)
                  return (
                    <span key={pid} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-1">
                      {p?.name?.slice(0, 30) ?? pid}
                      <button onClick={() => onLeave(c.id, pid)} disabled={busy} className="hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Ürün ekleme paneli */}
            {openId === c.id && (
              <div className="mt-4 border-t pt-4">
                {notJoined.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Eklenebilecek uygun ürününüz yok.</p>
                ) : (
                  <>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {notJoined.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected[p.id]}
                            onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                          />
                          <span className="flex-1">{p.name}</span>
                          <span className="text-muted-foreground">₺{Number(p.price)}</span>
                        </label>
                      ))}
                    </div>
                    <Button onClick={() => onJoin(c.id)} disabled={busy} className="mt-3">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Seçilenleri Kampanyaya Ekle'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
