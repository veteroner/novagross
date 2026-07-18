'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Input, Label } from '@novagross/ui'
import { Loader2, Upload, X, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Sipariş faturası (e-Arşiv PDF) yükleme diyaloğu.
 * Dosya client-side'dan doğrudan private 'invoices' bucket'ına yüklenir
 * ({storeId}/{orderId}/... — storage RLS satıcının kendi klasörünü zorlar),
 * ardından metadata /api/orders/[orderId]/invoice'a POST edilir.
 */
export function InvoiceDialog({
  orderId,
  orderNumber,
  storeId,
  existing,
  onDone,
  onClose,
}: {
  orderId: string
  orderNumber: string
  storeId: string
  existing: boolean
  onDone: () => void
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Lütfen fatura PDF dosyasını seçin.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya 10 MB üstünde olamaz.')
      return
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (file.type !== 'application/pdf' || ext !== 'pdf') {
      setError('Sadece PDF dosyası kabul edilir (e-Arşiv fatura çıktısı).')
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const path = `${storeId}/${orderId}/invoice_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.pdf`

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(path, file, { upsert: false, contentType: 'application/pdf' })
        if (uploadErr) throw uploadErr

        const res = await fetch(`/api/orders/${orderId}/invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: path,
            fileSize: file.size,
            invoiceNumber: invoiceNumber.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Fatura kaydedilemedi')

        onDone()
      } catch (err: any) {
        setError(err?.message ?? 'Yükleme başarısız.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {existing ? 'Faturayı Değiştir' : 'Fatura Yükle'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Sipariş <b>#{orderNumber}</b> için kestiğiniz e-Arşiv faturasının PDF çıktısını
          yükleyin. Müşteri, faturayı sipariş detayından indirebilecek.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="invoice_file">Fatura PDF * (max 10 MB)</Label>
            <input
              id="invoice_file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm rounded-md border border-input bg-background px-3 py-2"
              disabled={isPending}
              required
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="invoice_number">Fatura No (opsiyonel)</Label>
            <Input
              id="invoice_number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Örn. NVG2026000000123"
              disabled={isPending}
            />
          </div>

          {existing && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              Mevcut fatura bu dosyayla değiştirilecek; eski dosya silinir.
            </p>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending} className="text-white" style={{ backgroundColor: '#16A34A' }}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yükleniyor…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {existing ? 'Değiştir' : 'Yükle'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
