'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@novagross/ui'

const REASON_CATEGORIES = [
  { value: 'defective', label: 'Ürün arızalı / bozuk' },
  { value: 'wrong_item', label: 'Yanlış ürün gönderildi' },
  { value: 'not_as_described', label: 'Açıklamaya uygun değil' },
  { value: 'damaged_in_shipping', label: 'Kargoda hasar gördü' },
  { value: 'changed_mind', label: 'Fikrim değişti' },
  { value: 'late_delivery', label: 'Geç teslim edildi' },
  { value: 'other', label: 'Diğer' },
] as const

export function ReturnRequestForm({
  orderId,
  orderItemId,
  maxQuantity,
}: {
  orderId: string
  orderItemId: string
  maxQuantity: number
}) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(maxQuantity)
  const [reasonCategory, setReasonCategory] = useState<string>('')
  const [reason, setReason] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!reasonCategory) {
      setError('Lütfen bir iade nedeni seçin')
      return
    }

    if (reason.trim().length < 10) {
      setError('Lütfen iade nedeninizi en az 10 karakter açıklayın')
      return
    }

    if (quantity < 1 || quantity > maxQuantity) {
      setError(`Adet 1 ile ${maxQuantity} arasında olmalıdır`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/returns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderItemId,
          quantity,
          reasonCategory,
          reason: reason.trim(),
          customerNote: customerNote.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'İade talebi oluşturulamadı')
      }

      router.push('/hesabim/iadelerim?success=1')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium mb-1">İade Adedi</label>
        <Input
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">En fazla {maxQuantity} adet iade edebilirsiniz</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">İade Nedeni</label>
        <select
          className="w-full px-3 py-2 border rounded-md bg-background"
          value={reasonCategory}
          onChange={(e) => setReasonCategory(e.target.value)}
          required
        >
          <option value="">Bir neden seçin</option>
          {REASON_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Açıklama</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
          placeholder="İade sebebinizi detaylı yazın (örn. ürün çalışmıyor, hasarlı geldi vb.)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
          maxLength={500}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{reason.length}/500 karakter (min. 10)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Eklemek istediğiniz not (opsiyonel)</label>
        <textarea
          className="w-full px-3 py-2 border rounded-md bg-background min-h-[60px]"
          placeholder="Satıcı ya da admin için ek not"
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          maxLength={300}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Gönderiliyor...' : 'İade Talebini Gönder'}
      </Button>
    </form>
  )
}
