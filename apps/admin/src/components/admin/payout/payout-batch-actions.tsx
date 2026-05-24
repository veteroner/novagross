'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@novagross/ui'

type PayoutCandidate = {
  store_id: string
  store_name: string | null
  bank_name: string | null
  iban: string | null
  account_holder: string | null
  amount: number
  sale_count: number
}

function toCsvValue(value: unknown): string {
  const s = value == null ? '' : String(value)
  // RFC4180-ish
  const escaped = s.replace(/"/g, '""')
  return `"${escaped}"`
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] || {})
  const lines = [headers.map(toCsvValue).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue((row as any)[h])).join(','))
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PayoutBatchActions({
  asOf,
  candidates,
}: {
  asOf: string
  candidates: PayoutCandidate[]
}) {
  const router = useRouter()
  const [marking, setMarking] = useState(false)

  const totalAmount = useMemo(() => {
    return (candidates || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  }, [candidates])

  const onDownloadCsv = () => {
    const rows = (candidates || []).map((c) => ({
      run_date: asOf,
      store_name: c.store_name || '',
      amount: c.amount,
      bank_name: c.bank_name || '',
      iban: c.iban || '',
      account_holder: c.account_holder || '',
      sale_count: c.sale_count,
    }))

    downloadCsv(`payout-batch-${asOf}.csv`, rows)
  }

  const onMarkPaid = async () => {
    const reference = window.prompt('Banka referans / açıklama (opsiyonel):') || ''
    const ok = window.confirm(
      `Onaylıyor musun?\n\nTarih: ${asOf}\nMağaza sayısı: ${candidates.length}\nToplam: ${totalAmount.toFixed(2)}\n\nBu işlem geri alınmaz.`
    )
    if (!ok) return

    setMarking(true)
    try {
      const res = await fetch('/api/payout-batch/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asOf, reference: reference.trim() || null }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = json?.error || `HTTP ${res.status}`
        alert(`İşlem başarısız: ${msg}`)
        return
      }

      alert(
        `Tamamlandı.\n\nMağaza: ${json?.stores_marked ?? '-'}\nSatış satırı: ${json?.sales_marked ?? '-'}\nToplam: ${json?.total_amount ?? '-'}`
      )
      router.refresh()
    } finally {
      setMarking(false)
    }
  }

  const onChangeDate = (value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('asOf', value)
    router.push(url.pathname + url.search)
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Payout tarihi</label>
        <input
          type="date"
          value={asOf}
          onChange={(e) => onChangeDate(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.refresh()}>
          Yenile
        </Button>
        <Button variant="outline" onClick={onDownloadCsv} disabled={candidates.length === 0}>
          CSV İndir
        </Button>
        <Button onClick={onMarkPaid} disabled={marking || candidates.length === 0}>
          {marking ? 'İşleniyor…' : 'Ödendi İşaretle'}
        </Button>
      </div>
    </div>
  )
}
