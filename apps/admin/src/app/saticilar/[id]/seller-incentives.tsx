'use client'

import { useState } from 'react'
import { Button, Input } from '@novagross/ui'
import { Loader2, Wallet, Gift } from 'lucide-react'
import { grantAdBalance, createGiftCoupon } from './actions'

type GiftCoupon = {
  id: string
  amount: number
  remaining_amount: number
  type: string
  title: string | null
  status: string
  expires_at: string | null
  created_at: string
}

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

export function SellerIncentives({
  storeId,
  adBalance,
  coupons,
}: {
  storeId: string
  adBalance: number
  coupons: GiftCoupon[]
}) {
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceDesc, setBalanceDesc] = useState('')
  const [savingBalance, setSavingBalance] = useState(false)

  const [couponAmount, setCouponAmount] = useState('')
  const [couponType, setCouponType] = useState<'commission_credit' | 'ad_credit'>('commission_credit')
  const [couponTitle, setCouponTitle] = useState('')
  const [couponExpiry, setCouponExpiry] = useState('')
  const [savingCoupon, setSavingCoupon] = useState(false)

  const onGrantBalance = async () => {
    const amount = Number(balanceAmount)
    if (!amount || amount <= 0) return alert('Geçerli bir tutar girin.')
    setSavingBalance(true)
    try {
      await grantAdBalance(storeId, amount, balanceDesc)
      setBalanceAmount('')
      setBalanceDesc('')
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setSavingBalance(false)
    }
  }

  const onCreateCoupon = async () => {
    const amount = Number(couponAmount)
    if (!amount || amount <= 0) return alert('Geçerli bir tutar girin.')
    setSavingCoupon(true)
    try {
      await createGiftCoupon(storeId, {
        amount,
        type: couponType,
        title: couponTitle,
        expiresAt: couponExpiry ? new Date(couponExpiry).toISOString() : null,
      })
      setCouponAmount('')
      setCouponTitle('')
      setCouponExpiry('')
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setSavingCoupon(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Reklam bakiyesi */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Mevcut Reklam Bakiyesi
          </span>
          <span className="text-lg font-bold text-orange-700">{formatTRY(adBalance)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Tutar (₺)"
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(e.target.value)}
          />
          <Input
            placeholder="Açıklama (opsiyonel)"
            value={balanceDesc}
            onChange={(e) => setBalanceDesc(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
        <Button onClick={onGrantBalance} disabled={savingBalance} className="mt-2">
          {savingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reklam Bakiyesi Tanımla'}
        </Button>
      </div>

      <hr />

      {/* Hediye kuponu */}
      <div>
        <span className="text-sm font-medium flex items-center gap-2 mb-2">
          <Gift className="h-4 w-4" /> Hediye Kuponu Tanımla
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Tutar (₺)"
            value={couponAmount}
            onChange={(e) => setCouponAmount(e.target.value)}
          />
          <select
            value={couponType}
            onChange={(e) => setCouponType(e.target.value as any)}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="commission_credit">Komisyon Kredisi (faturadan düşülür)</option>
            <option value="ad_credit">Reklam Kredisi (bakiyeye eklenir)</option>
          </select>
          <Input
            placeholder="Başlık (opsiyonel)"
            value={couponTitle}
            onChange={(e) => setCouponTitle(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Son kullanma"
            value={couponExpiry}
            onChange={(e) => setCouponExpiry(e.target.value)}
          />
        </div>
        <Button onClick={onCreateCoupon} disabled={savingCoupon} className="mt-2">
          {savingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hediye Kuponu Oluştur'}
        </Button>
      </div>

      {/* Mevcut kuponlar */}
      {coupons.length > 0 && (
        <div>
          <span className="text-sm font-medium">Tanımlı Kuponlar</span>
          <div className="mt-2 space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div>
                  <span className="font-medium">{c.title || (c.type === 'commission_credit' ? 'Komisyon kredisi' : 'Reklam kredisi')}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {c.type === 'commission_credit' ? `${formatTRY(c.remaining_amount)} / ${formatTRY(c.amount)}` : formatTRY(c.amount)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.status === 'active' ? 'Aktif' : c.status === 'used' ? 'Kullanıldı' : c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
