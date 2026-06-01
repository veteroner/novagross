'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Check, X, Loader2 } from 'lucide-react'
import { acceptOffer, rejectOffer } from './actions'

export function ResponseButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const accept = () =>
    startTransition(async () => {
      if (!confirm('Bu teklifi kabul etmek istediğinizden emin misiniz?')) return
      try {
        await acceptOffer(id)
      } catch (e: any) {
        alert(e?.message ?? 'Kabul başarısız.')
      }
    })

  const reject = () =>
    startTransition(async () => {
      try {
        await rejectOffer(id, reason)
        setShowReject(false)
      } catch (e: any) {
        alert(e?.message ?? 'Red başarısız.')
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
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gönder'}
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
      <Button
        size="sm"
        onClick={accept}
        disabled={isPending}
        className="bg-green-600 text-white hover:bg-green-700"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Check className="h-3 w-3 mr-1" />
        )}
        Kabul Et
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowReject(true)}
        disabled={isPending}
        className="text-red-600"
      >
        <X className="h-3 w-3 mr-1" />
        Reddet
      </Button>
    </div>
  )
}
