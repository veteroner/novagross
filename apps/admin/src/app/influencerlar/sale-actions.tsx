'use client'

import { useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Check, Wallet, Loader2 } from 'lucide-react'
import { confirmAffiliateSale, markAffiliateSalePaid } from './actions'

export function SaleActions({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()

  const confirm = () =>
    startTransition(async () => {
      try {
        await confirmAffiliateSale(id)
      } catch (e: any) {
        alert(e?.message ?? 'Onay başarısız.')
      }
    })

  const pay = () =>
    startTransition(async () => {
      if (!window.confirm('Bu komisyon ödendi olarak işaretlensin mi?')) return
      try {
        await markAffiliateSalePaid(id)
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })

  return (
    <div className="flex items-center gap-1 justify-end">
      {status === 'pending' && (
        <Button
          size="sm"
          onClick={confirm}
          disabled={isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
          title="Onayla (komisyonu kesinleştir)"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
      )}
      {status === 'confirmed' && (
        <Button
          size="sm"
          onClick={pay}
          disabled={isPending}
          className="bg-green-600 text-white hover:bg-green-700"
          title="Ödendi olarak işaretle"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
        </Button>
      )}
    </div>
  )
}
