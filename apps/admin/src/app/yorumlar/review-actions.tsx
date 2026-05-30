'use client'

import { useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Check, EyeOff, Eye, Trash2, Loader2 } from 'lucide-react'
import {
  approveReview,
  unapproveReview,
  deleteReview,
  hideStoreReview,
  unhideStoreReview,
  deleteStoreReview,
} from './actions'

type ProductReviewActionsProps = {
  id: string
  isApproved: boolean
}

export function ProductReviewActions({ id, isApproved }: ProductReviewActionsProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-end gap-2">
      {isApproved ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => unapproveReview(id))}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
          <span className="ml-1">Onayı Kaldır</span>
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => approveReview(id))}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          <span className="ml-1">Onayla</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 hover:text-red-700"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Bu yorumu silmek istediğine emin misin? Geri alınamaz.')) return
          startTransition(() => deleteReview(id))
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

type StoreReviewActionsProps = {
  id: string
  isHidden: boolean
}

export function StoreReviewActions({ id, isHidden }: StoreReviewActionsProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-end gap-2">
      {isHidden ? (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => unhideStoreReview(id))}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
          <span className="ml-1">Göster</span>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => hideStoreReview(id))}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
          <span className="ml-1">Gizle</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 hover:text-red-700"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Bu yorumu silmek istediğine emin misin? Geri alınamaz.')) return
          startTransition(() => deleteStoreReview(id))
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
