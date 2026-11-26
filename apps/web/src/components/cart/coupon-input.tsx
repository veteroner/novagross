'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@novagross/ui'
import { Tag, X, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cart-store'

interface AppliedCoupon {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  discountAmount: number
  freeShipping: boolean
}

interface CouponInputProps {
  subtotal: number
  items: ReadonlyArray<{ productId: string; price: number; quantity: number }>
  onApply: (coupon: AppliedCoupon | null) => void
  appliedCoupon: AppliedCoupon | null
}

type Result = { ok: true; coupon: AppliedCoupon } | { ok: false; error: string }

/**
 * Kupon kodunu doğrular. Uygulanan kod sepet deposunda (localStorage) tutulur:
 * sepetten ödemeye geçince ve ürün/miktar değişince aynı kod yeniden doğrulanır,
 * indirim güncel sepete göre hesaplanır. Geçerliliğini yitiren kod kaldırılır.
 */
export function CouponInput({ subtotal, items, onApply, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const storedCode = useCartStore((s) => s.couponCode)
  const setStoredCode = useCartStore((s) => s.setCouponCode)
  const supabase = createClient()

  const validate = async (raw: string): Promise<Result> => {
    const normalized = raw.trim().toUpperCase()
    if (!normalized) return { ok: false, error: 'Kupon kodu girin.' }

    if (normalized === 'BILGOO') {
      const [flag, offerRes] = await Promise.all([
        fetch('/api/campaigns/bilgoo', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        (supabase as any).rpc('get_bilgoo_offer'),
      ])
      const offer = offerRes?.data
      if (!flag?.checkoutEnabled || offerRes?.error || !offer) return { ok: false, error: 'BILGOO kampanyası şu anda açık değil.' }
      if (offer.status === 'sold_out' || offer.status === 'reserved') return { ok: false, error: 'BILGOO kampanya kotası doldu.' }
      if (offer.status !== 'active') return { ok: false, error: 'BILGOO kampanyası şu anda açık değil.' }
      const ids: string[] = offer.product_ids ?? []
      const eligibleKurus = items.reduce((t, i) => ids.includes(i.productId) ? t + Math.round(i.price * 100) * i.quantity : t, 0)
      if (eligibleKurus < 50000) return { ok: false, error: 'Kampanyalı ürünlerin kargo hariç toplamı en az 500 TL olmalı.' }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).in('payment_status', ['paid', 'refunded'])
        if ((count ?? 0) > 0) return { ok: false, error: 'BILGOO kodu yalnızca NovaGross\'taki ilk siparişte geçerlidir.' }
      }
      return { ok: true, coupon: { code: 'BILGOO', type: 'fixed', value: 100, discountAmount: Math.min(100, subtotal), freeShipping: false } }
    }

    // SECURITY: RPC validate_coupon_code — coupon code enumeration koruması
    const { data: rows, error: rpcError } = await (supabase as any).rpc('validate_coupon_code', {
      p_code: normalized, p_subtotal: subtotal,
    })
    if (rpcError) return { ok: false, error: 'Kupon şu anda doğrulanamadı. Lütfen tekrar deneyin.' }
    const result = Array.isArray(rows) ? rows[0] : rows
    if (!result?.is_valid) return { ok: false, error: result?.reason || 'Geçersiz kupon kodu.' }

    const freeShipping = Boolean(result.free_shipping)
    let discountAmount = 0
    if (result.discount_type === 'percentage') {
      discountAmount = (subtotal * Number(result.discount_value)) / 100
    } else if (result.discount_type === 'fixed') discountAmount = Number(result.discount_value)
    else if (!freeShipping) return { ok: false, error: 'Geçersiz kupon tipi.' }
    if (result.maximum_discount != null && Number(result.maximum_discount) > 0) discountAmount = Math.min(discountAmount, Number(result.maximum_discount))
    discountAmount = Math.min(Math.max(Number.isFinite(discountAmount) ? discountAmount : 0, 0), subtotal)
    discountAmount = Math.round(discountAmount * 100) / 100
    if (discountAmount <= 0 && !freeShipping) return { ok: false, error: 'Kupon indirimi hesaplanamadı.' }
    return {
      ok: true,
      coupon: { code: normalized, type: result.discount_type, value: Number(result.discount_value || 0), discountAmount, freeShipping },
    }
  }

  // Kayıtlı kodu sepet değiştikçe yeniden doğrula (ilk açılış dahil).
  const cartKey = items.map((i) => `${i.productId}:${i.quantity}:${i.price}`).join('|')
  const runId = useRef(0)
  useEffect(() => {
    if (!storedCode) return
    const id = ++runId.current
    validate(storedCode).then((r) => {
      if (id !== runId.current) return
      if (r.ok) { onApply(r.coupon); setError(null) }
      else { onApply(null); setStoredCode(null); setError(`${storedCode} kuponu kaldırıldı: ${r.error}`) }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedCode, cartKey])

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const r = await validate(code)
      if (r.ok) {
        onApply(r.coupon)
        setStoredCode(r.coupon.code)
        setCode('')
      } else {
        setError(r.error)
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    }
    setLoading(false)
  }

  const handleRemove = () => {
    runId.current++
    onApply(null)
    setStoredCode(null)
    setError(null)
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">{appliedCoupon.code}</p>
            <p className="text-sm text-green-600">
              {appliedCoupon.type === 'percentage'
                ? `%${appliedCoupon.value} indirim`
                : `${appliedCoupon.discountAmount} TL indirim`}
              {appliedCoupon.freeShipping ? ' • Kargo bedava' : ''}
            </p>
          </div>
        </div>
        <button onClick={handleRemove} aria-label="Kuponu kaldır" className="p-1 hover:bg-green-100 rounded">
          <X className="h-4 w-4 text-green-700" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleApply() }}>
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kupon kodu"
            aria-label="Kupon kodu"
            autoCapitalize="characters"
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={loading || !code.trim()} variant="outline">
          {loading ? 'Kontrol...' : 'Uygula'}
        </Button>
      </form>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
