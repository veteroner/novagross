'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Check, X, Pause, Loader2 } from 'lucide-react'
import { approveAdCampaign, rejectAdCampaign, pauseAdCampaign } from './actions'

export function ModerationActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const approve = () =>
    startTransition(async () => {
      try {
        await approveAdCampaign(id)
      } catch (e: any) {
        alert(e?.message ?? 'Onay başarısız.')
      }
    })

  const reject = () =>
    startTransition(async () => {
      try {
        await rejectAdCampaign(id, reason)
        setShowReject(false)
        setReason('')
      } catch (e: any) {
        alert(e?.message ?? 'Red başarısız.')
      }
    })

  const pause = () =>
    startTransition(async () => {
      try {
        await pauseAdCampaign(id)
      } catch (e: any) {
        alert(e?.message ?? 'Duraklatma başarısız.')
      }
    })

  if (showReject) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Red sebebi"
          className="text-xs border rounded px-2 py-1 w-40"
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="destructive"
          onClick={reject}
          disabled={isPending || reason.trim().length < 3}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reddet'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setShowReject(false)
            setReason('')
          }}
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
            onClick={approve}
            disabled={isPending}
            className="bg-green-600 text-white hover:bg-green-700"
            title="Onayla"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
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
          onClick={pause}
          disabled={isPending}
          title="Duraklat"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
        </Button>
      )}
    </div>
  )
}
