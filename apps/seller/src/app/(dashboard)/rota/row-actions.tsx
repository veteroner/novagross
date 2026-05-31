'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, Check } from 'lucide-react'
import { applyPriceSuggestion } from './actions'

function formatTry(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

export function RowActions({
  productId,
  currentPrice,
  suggestedPrice,
}: {
  productId: string
  currentPrice: number
  suggestedPrice: number
}) {
  const [custom, setCustom] = useState<number>(suggestedPrice)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onApply = (price: number) => {
    setError(null)
    setDone(false)
    startTransition(async () => {
      try {
        await applyPriceSuggestion(productId, price)
        setDone(true)
      } catch (err: any) {
        setError(err?.message ?? 'İşlem başarısız.')
      }
    })
  }

  if (done) {
    return (
      <div className="text-sm text-green-700 flex items-center gap-1 justify-end">
        <Check className="h-4 w-4" />
        Yeni fiyat uygulandı
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={currentPrice - 0.01}
          value={custom}
          onChange={(e) => setCustom(Number(e.target.value))}
          className="w-28 rounded-md border border-input px-2 py-1 text-sm text-right"
          disabled={isPending}
        />
        <Button
          size="sm"
          style={{ backgroundColor: '#16A34A' }}
          className="text-white"
          onClick={() => onApply(custom)}
          disabled={isPending || !custom || custom <= 0 || custom >= currentPrice}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Uygula
        </Button>
      </div>
      <div className="text-xs text-gray-500">
        Önerilen: {formatTry(suggestedPrice)}
      </div>
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  )
}
