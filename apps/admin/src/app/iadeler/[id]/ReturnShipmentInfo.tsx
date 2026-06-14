'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'

export function ReturnShipmentInfo({
  requestId,
  carrierCode,
  trackingNumber,
  trackingUrl,
  error,
}: {
  requestId: string
  carrierCode?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  error?: string | null
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function regenerate() {
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/returns/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'create_return_label' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İade kargosu oluşturulamadı')
      router.refresh()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>İade Kargosu</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {trackingNumber ? (
          <>
            <p>
              <strong>Kargo:</strong> {(carrierCode || 'mng').toUpperCase()}
            </p>
            <p>
              <strong>Takip No:</strong> <span className="font-mono">{trackingNumber}</span>
            </p>
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Kargoyu takip et →
              </a>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Barkod müşterinin İadelerim sayfasında yazdırılabilir.
            </p>
          </>
        ) : (
          <>
            <p className="text-yellow-800">
              ⚠️ İade kargosu henüz oluşturulmadı{error ? `: ${error}` : '.'}
            </p>
            <Button onClick={regenerate} disabled={submitting} variant="outline">
              {submitting ? 'Oluşturuluyor...' : '🔄 İade Kargosunu Oluştur'}
            </Button>
          </>
        )}
        {msg ? <p className="text-red-700">{msg}</p> : null}
      </CardContent>
    </Card>
  )
}
