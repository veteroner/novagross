'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@novagross/ui'
import { Loader2 } from 'lucide-react'

export default function MngCommissionInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cargo/commission-invoices?days=90')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Faturalar alınamadı')
      setInvoices(data.invoices || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="MNG Kargo Faturaları"
        description="MNG'nin platformumuza kestiği kargo/komisyon faturaları (son 90 gün, gerçek zamanlı)"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card><CardContent className="py-8 text-center text-red-600">{error}</CardContent></Card>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">Bu dönemde fatura bulunamadı.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Faturalar ({invoices.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Fatura No</th>
                  <th className="py-2 pr-4">Tarih</th>
                  <th className="py-2 pr-4">E-Fatura No</th>
                  <th className="py-2 pr-4">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono">{inv.invoiceNumber || '—'}</td>
                    <td className="py-2 pr-4">{inv.invoiceDateTime || '—'}</td>
                    <td className="py-2 pr-4 font-mono">{inv.eInvoiceId || '—'}</td>
                    <td className="py-2 pr-4">{inv.finalTotal || inv.total || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
