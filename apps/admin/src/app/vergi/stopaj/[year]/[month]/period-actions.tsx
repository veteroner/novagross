'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, CheckSquare, Wallet } from 'lucide-react'
import { markSubmitted, markPaid } from './actions'

export function PeriodStatusActions({
  periodId,
  status,
}: {
  periodId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const [openForm, setOpenForm] = useState<'submit' | 'pay' | null>(null)
  const [reference, setReference] = useState('')

  const submit = () =>
    startTransition(async () => {
      try {
        await markSubmitted(periodId, reference)
        setOpenForm(null)
        setReference('')
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })

  const pay = () =>
    startTransition(async () => {
      try {
        await markPaid(periodId, reference)
        setOpenForm(null)
        setReference('')
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })

  if (openForm) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={
            openForm === 'submit'
              ? 'GİB tahakkuk no'
              : 'Banka dekont referansı'
          }
          className="text-xs border rounded px-2 py-1 w-48"
          disabled={isPending}
        />
        <Button
          size="sm"
          onClick={openForm === 'submit' ? submit : pay}
          disabled={isPending || reference.trim().length < 3}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Kaydet'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpenForm(null)
            setReference('')
          }}
          disabled={isPending}
        >
          İptal
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === 'open' && (
        <Button
          size="sm"
          onClick={() => setOpenForm('submit')}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          Beyan verildi olarak işaretle
        </Button>
      )}
      {status === 'submitted' && (
        <Button
          size="sm"
          onClick={() => setOpenForm('pay')}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          <Wallet className="h-3 w-3 mr-1" />
          Ödendi olarak işaretle
        </Button>
      )}
    </div>
  )
}
