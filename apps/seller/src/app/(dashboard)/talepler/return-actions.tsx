'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@novagross/ui'
import { Loader2, CheckCircle, X } from 'lucide-react'
import { decideReturn } from './return-actions-server'

export function ReturnActions({ requestId, canDecide }: { requestId: string; canDecide: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [note, setNote] = useState('')

  if (!canDecide) {
    return (
      <p className="mt-3 text-xs text-gray-500">
        İade kararını mağaza sahibi veya yöneticisi verebilir.
      </p>
    )
  }

  const submit = (decision: 'approve' | 'reject') => {
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await decideReturn(requestId, decision, note)
        if (decision === 'approve' && res.shipmentError) {
          setInfo(`İade onaylandı. İade kargo kodu oluşturulamadı: ${res.shipmentError}`)
        }
        setMode('idle')
        router.refresh()
      } catch (err: any) {
        setError(err?.message ?? 'İşlem başarısız.')
      }
    })
  }

  return (
    <div className="space-y-2 mt-3">
      {mode !== 'idle' && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            mode === 'reject'
              ? 'Red gerekçesi (müşteriye gösterilir, en az 5 karakter)…'
              : 'Müşteriye not (opsiyonel)…'
          }
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={isPending}
          autoFocus
        />
      )}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</div>
      )}
      {info && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">{info}</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'idle' ? (
          <>
            <Button
              size="sm"
              style={{ backgroundColor: '#16A34A' }}
              className="text-white"
              onClick={() => setMode('approve')}
              disabled={isPending}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              İadeyi Onayla
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700"
              onClick={() => setMode('reject')}
              disabled={isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Reddet
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              style={mode === 'approve' ? { backgroundColor: '#16A34A' } : { backgroundColor: '#DC2626' }}
              className="text-white"
              onClick={() => submit(mode)}
              disabled={isPending || (mode === 'reject' && note.trim().length < 5)}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {mode === 'approve' ? 'Onayı Gönder' : 'Reddi Gönder'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('idle')} disabled={isPending}>
              Vazgeç
            </Button>
          </>
        )}
      </div>
      {mode === 'approve' && (
        <p className="text-xs text-gray-500">
          Onaylayınca müşteri için MNG iade kargo kodu oluşturulur; ödeme iadesi Novagross
          tarafından yapılır.
        </p>
      )}
    </div>
  )
}
