'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react'
import { updateClaim, type ClaimStatus } from './actions'

export function ClaimActions({
  claimId,
  currentStatus,
  initialResolution,
  initialRefund,
}: {
  claimId: string
  currentStatus: ClaimStatus
  initialResolution: string | null
  initialRefund: number | null
}) {
  const [resolution, setResolution] = useState(initialResolution ?? '')
  const [refund, setRefund] = useState<number | null>(initialRefund)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ClaimStatus>(currentStatus)

  const update = (next: Partial<Parameters<typeof updateClaim>[1]>) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateClaim(claimId, next)
        if (next.status) setStatus(next.status)
      } catch (err: any) {
        setError(err?.message ?? 'İşlem başarısız.')
      }
    })
  }

  if (status === 'resolved' || status === 'rejected') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm space-y-1">
        <div className="flex items-center gap-2 text-gray-700">
          {status === 'resolved' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-red-600" />
          )}
          <span className="font-medium">
            {status === 'resolved' ? 'Çözüldü' : 'Reddedildi'}
          </span>
        </div>
        {initialResolution && <p className="text-gray-700">{initialResolution}</p>}
        {initialRefund != null && (
          <p className="text-xs text-gray-500">
            İade tutarı: <strong>{initialRefund.toFixed(2)} ₺</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-3">
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Çözüm açıklaması (müşteriye gösterilecek)…"
        rows={2}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        disabled={isPending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-600">İade tutarı (₺):</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={refund ?? ''}
          onChange={(e) => setRefund(e.target.value === '' ? null : Number(e.target.value))}
          className="w-28 rounded-md border border-input px-2 py-1 text-sm text-right"
          disabled={isPending}
          placeholder="opsiyonel"
        />
      </div>
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          style={{ backgroundColor: '#16A34A' }}
          className="text-white"
          onClick={() =>
            update({ status: 'resolved', resolution, refund_amount: refund })
          }
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
          Çöz
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            update({ status: 'in_progress', resolution })
          }
          disabled={isPending || status === 'in_progress'}
        >
          İşleme Al
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-700"
          onClick={() =>
            update({ status: 'rejected', resolution })
          }
          disabled={isPending}
        >
          <X className="h-3 w-3 mr-1" />
          Reddet
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-orange-700"
          onClick={() => update({ escalate: true, resolution })}
          disabled={isPending}
          title="Admine ilet"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Admin&apos;e ilet
        </Button>
      </div>
    </div>
  )
}
