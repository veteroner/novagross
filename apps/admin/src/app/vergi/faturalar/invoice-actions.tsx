'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, FileCheck, Ban, PlusCircle } from 'lucide-react'
import { generateInvoices, issueInvoice, cancelInvoice } from './actions'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export function GenerateInvoicesForm() {
  const now = new Date()
  // Varsayılan: bir önceki ay (fatura dönemi kapandıktan sonra kesilir)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [year, setYear] = useState(prev.getFullYear())
  const [month, setMonth] = useState(prev.getMonth() + 1)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const run = () =>
    startTransition(async () => {
      setMessage(null)
      try {
        const { created } = await generateInvoices(year, month)
        setMessage(
          created > 0
            ? `${created} fatura taslağı oluşturuldu.`
            : 'Yeni taslak yok — dönemde komisyon kaydı bulunamadı veya hepsi zaten oluşturulmuş.'
        )
      } catch (e: any) {
        setMessage(e?.message ?? 'İşlem başarısız.')
      }
    })

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
        disabled={isPending}
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
      >
        {MONTH_NAMES_TR.slice(1).map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        disabled={isPending}
        className="border rounded-md px-3 py-1.5 text-sm bg-white"
      >
        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={run}
        disabled={isPending}
        className="bg-orange-600 text-white hover:bg-orange-700"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <PlusCircle className="h-3 w-3 mr-1" />
        )}
        Dönem faturalarını oluştur
      </Button>
      {message && <span className="text-xs text-gray-600">{message}</span>}
    </div>
  )
}

export function InvoiceRowActions({
  invoiceId,
  status,
}: {
  invoiceId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')

  const issue = () => {
    if (!confirm('Fatura kesilecek ve e-arşiv sağlayıcısına gönderilecek. Devam?')) return
    startTransition(async () => {
      try {
        await issueInvoice(invoiceId)
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })
  }

  const cancel = () =>
    startTransition(async () => {
      try {
        await cancelInvoice(invoiceId, reason)
        setCancelOpen(false)
        setReason('')
      } catch (e: any) {
        alert(e?.message ?? 'İşlem başarısız.')
      }
    })

  if (cancelOpen) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="İptal gerekçesi"
          className="text-xs border rounded px-2 py-1 w-36"
          disabled={isPending}
        />
        <Button
          size="sm"
          onClick={cancel}
          disabled={isPending || reason.trim().length < 3}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'İptal et'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCancelOpen(false)} disabled={isPending}>
          Vazgeç
        </Button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {status === 'draft' && (
        <Button
          size="sm"
          onClick={issue}
          disabled={isPending}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <FileCheck className="h-3 w-3 mr-1" />
              Kes & gönder
            </>
          )}
        </Button>
      )}
      {status !== 'cancelled' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCancelOpen(true)}
          disabled={isPending}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <Ban className="h-3 w-3" />
        </Button>
      )}
    </span>
  )
}
