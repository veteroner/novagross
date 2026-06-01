'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Check, X, Pause, Loader2 } from 'lucide-react'
import { approveInfluencer, rejectInfluencer, suspendInfluencer } from './actions'

export function ModerationActions({
  id,
  status,
  defaultCommission,
}: {
  id: string
  status: string
  defaultCommission: number
}) {
  const [isPending, startTransition] = useTransition()
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [commission, setCommission] = useState(defaultCommission)
  const [reason, setReason] = useState('')

  const approve = () =>
    startTransition(async () => {
      try {
        await approveInfluencer(id, commission)
        setShowApprove(false)
      } catch (e: any) {
        alert(e?.message ?? 'Onay başarısız.')
      }
    })

  const reject = () =>
    startTransition(async () => {
      try {
        await rejectInfluencer(id, reason)
        setShowReject(false)
        setReason('')
      } catch (e: any) {
        alert(e?.message ?? 'Red başarısız.')
      }
    })

  const suspend = () =>
    startTransition(async () => {
      if (!confirm('Bu influencer’ı askıya almak istediğinizden emin misiniz?')) return
      try {
        await suspendInfluencer(id)
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })

  if (showApprove) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600">Komisyon %</span>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
          className="text-xs border rounded px-2 py-1 w-16"
          disabled={isPending}
        />
        <Button
          size="sm"
          onClick={approve}
          disabled={isPending}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Onayla'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowApprove(false)}
          disabled={isPending}
        >
          İptal
        </Button>
      </div>
    )
  }

  if (showReject) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Red sebebi"
          className="text-xs border rounded px-2 py-1 w-36"
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="destructive"
          onClick={reject}
          disabled={isPending || reason.trim().length < 3}
        >
          Reddet
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowReject(false)}
          disabled={isPending}
        >
          İptal
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {status === 'pending' && (
        <>
          <Button
            size="sm"
            onClick={() => setShowApprove(true)}
            disabled={isPending}
            className="bg-green-600 text-white hover:bg-green-700"
            title="Onayla"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowReject(true)}
            disabled={isPending}
            title="Reddet"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
      {status === 'approved' && (
        <Button
          size="sm"
          variant="outline"
          onClick={suspend}
          disabled={isPending}
          title="Askıya al"
        >
          <Pause className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
