'use client'

import { useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteDocument } from './actions'

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const onClick = () => {
    if (!confirm('Bu belgeyi silmek istediğine emin misin?')) return
    startTransition(async () => {
      try {
        await deleteDocument(id)
      } catch (err: any) {
        alert(err?.message ?? 'Silinemedi.')
      }
    })
  }
  return (
    <Button size="sm" variant="ghost" className="text-red-600" onClick={onClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </Button>
  )
}
