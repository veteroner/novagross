'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2 } from 'lucide-react'
import { replyToProductReview, replyToStoreReview } from './actions'

export function ReplyForm({
  reviewId,
  kind,
  initialReply,
  approved,
}: {
  reviewId: string
  kind: 'product' | 'store'
  initialReply: string | null
  approved: boolean | null
}) {
  const [reply, setReply] = useState(initialReply ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(!initialReply)

  if (initialReply && !editing) {
    return (
      <div className="bg-gray-50 rounded-md p-3 border border-gray-200 mt-2">
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
          <span className="font-medium">Yanıtınız</span>
          {approved === true ? (
            <span className="text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              ✓ Onaylı
            </span>
          ) : approved === false ? (
            <span className="text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              ✕ Reddedildi
            </span>
          ) : (
            <span className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
              ⏳ Moderasyonda
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{initialReply}</p>
        <button
          type="button"
          className="text-xs text-green-700 hover:underline mt-1"
          onClick={() => setEditing(true)}
        >
          Düzenle
        </button>
      </div>
    )
  }

  const onSubmit = () => {
    setError(null)
    startTransition(async () => {
      try {
        if (kind === 'product') {
          await replyToProductReview(reviewId, reply)
        } else {
          await replyToStoreReview(reviewId, reply)
        }
        setEditing(false)
      } catch (err: any) {
        setError(err?.message ?? 'Yanıt kaydedilemedi.')
      }
    })
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Müşterinize bir yanıt yazın…"
        rows={2}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        disabled={isPending}
      />
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isPending || reply.trim().length < 2}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {initialReply ? 'Güncelle' : 'Yanıt Gönder'}
        </Button>
        {initialReply && (
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
            İptal
          </Button>
        )}
        <span className="text-xs text-gray-500">
          Yanıtınız admin onayından sonra herkese gösterilir.
        </span>
      </div>
    </div>
  )
}
