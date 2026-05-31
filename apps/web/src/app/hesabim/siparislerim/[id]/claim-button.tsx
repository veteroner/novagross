'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, AlertCircle, X, CheckCircle } from 'lucide-react'
import { createCustomerClaim, type ClaimType } from './claim-actions'

const CLAIM_OPTIONS: Array<{ value: ClaimType; label: string }> = [
  { value: 'return', label: 'İade' },
  { value: 'exchange', label: 'Değişim' },
  { value: 'damage', label: 'Hasarlı Ürün' },
  { value: 'missing', label: 'Eksik Ürün' },
  { value: 'complaint', label: 'Şikayet' },
]

export function ClaimButton({
  orderId,
  orderItemId,
  existingClaim,
}: {
  orderId: string
  orderItemId: string
  existingClaim: { id: string; status: string; claim_type: string } | null
}) {
  const [open, setOpen] = useState(false)
  const [claimType, setClaimType] = useState<ClaimType>('return')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (existingClaim) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5"
        title={`Talep durumu: ${existingClaim.status}`}
      >
        <AlertCircle className="h-3 w-3" />
        Talep açıldı
      </span>
    )
  }

  if (success) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        <CheckCircle className="h-3 w-3" />
        Talep gönderildi
      </span>
    )
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createCustomerClaim({
          orderId,
          orderItemId,
          claimType,
          reason,
          description,
        })
        setSuccess(true)
        setOpen(false)
      } catch (err: any) {
        setError(err?.message ?? 'Talep oluşturulamadı.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-primary underline"
      >
        <AlertCircle className="h-3 w-3" />
        Talep aç
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Talep Aç</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Talep Tipi</label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as ClaimType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isPending}
                >
                  {CLAIM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kısa Sebep *</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="Örn: Ürün hasarlı geldi"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Detay (opsiyonel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Detayları yazın..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isPending}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  İptal
                </Button>
                <Button type="submit" disabled={isPending || !reason.trim()}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Gönderiliyor…
                    </>
                  ) : (
                    'Talebi Gönder'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
