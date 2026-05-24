'use client'

import { useState } from 'react'
import { Button, Input } from '@novagross/ui'
import { Tag, X, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AppliedCoupon {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  discountAmount: number
  freeShipping: boolean
}

interface CouponInputProps {
  subtotal: number
  onApply: (coupon: AppliedCoupon | null) => void
  appliedCoupon: AppliedCoupon | null
}

export function CouponInput({ subtotal, onApply, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleApply = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (couponError || !coupon) {
        setError('Geçersiz kupon kodu')
        setLoading(false)
        return
      }

      // Check validity dates
      const now = new Date()
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        setError('Bu kupon henüz aktif değil')
        setLoading(false)
        return
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        setError('Bu kuponun süresi dolmuş')
        setLoading(false)
        return
      }

      // Check minimum order amount
      if (coupon.minimum_amount && subtotal < coupon.minimum_amount) {
        setError(`Minimum sipariş tutarı: ${coupon.minimum_amount} TL`)
        setLoading(false)
        return
      }

      // Check max uses
      if (coupon.usage_limit != null) {
        const usedCount = typeof coupon.used_count === 'number' ? coupon.used_count : 0
        if (usedCount >= coupon.usage_limit) {
          setError('Bu kuponun kullanım limiti dolmuş')
          setLoading(false)
          return
        }
      }

      // Calculate discount
      let discountAmount = 0
      const freeShipping = Boolean((coupon as any).free_shipping)
      if (coupon.discount_type === 'percentage') {
        discountAmount = (subtotal * Number(coupon.discount_value)) / 100
        if (coupon.maximum_discount && discountAmount > Number(coupon.maximum_discount)) {
          discountAmount = Number(coupon.maximum_discount)
        }
      } else if (coupon.discount_type === 'fixed') {
        discountAmount = Number(coupon.discount_value)
      } else {
        setError('Geçersiz kupon tipi')
        setLoading(false)
        return
      }

      if (discountAmount > subtotal) discountAmount = subtotal
      if (!Number.isFinite(discountAmount) || discountAmount < 0 || (discountAmount <= 0 && !freeShipping)) {
        setError('Kupon indirimi hesaplanamadı')
        setLoading(false)
        return
      }

      onApply({
        code: coupon.code,
        type: coupon.discount_type,
        value: Number(coupon.discount_value),
        discountAmount,
        freeShipping,
      })
      setCode('')
    } catch (err) {
      setError('Bir hata oluştu')
    }

    setLoading(false)
  }

  const handleRemove = () => {
    onApply(null)
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
                : `${appliedCoupon.value} TL indirim`}
              {appliedCoupon.freeShipping ? ' • Kargo bedava' : ''}
            </p>
          </div>
        </div>
        <button onClick={handleRemove} className="p-1 hover:bg-green-100 rounded">
          <X className="h-4 w-4 text-green-700" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kupon kodu"
            className="pl-10"
          />
        </div>
        <Button 
          onClick={handleApply}
          disabled={loading || !code.trim()}
          variant="outline"
        >
          {loading ? 'Kontrol...' : 'Uygula'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
