'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'

export function ReturnActions({
  requestId,
  adminId,
  markRefundedOnly,
}: {
  requestId: string
  adminId: string
  markRefundedOnly?: boolean
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [iyzicoRefundId, setIyzicoRefundId] = useState('')

  async function callAction(action: 'approve' | 'reject' | 'mark_refunded') {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/returns/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          adminId,
          action,
          adminNote: action === 'approve' ? adminNote : undefined,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
          iyzicoRefundId: action === 'mark_refunded' ? iyzicoRefundId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aksiyon başarısız')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (markRefundedOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>iyzico Refund'ı Manuel İşaretle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <div className="text-red-700 text-sm">{error}</div> : null}
          <p className="text-sm text-muted-foreground">
            iyzico'da müşterinin parası iade edildikten sonra buraya refund ID'sini girip
            işaretleyin.
          </p>
          <input
            className="w-full px-3 py-2 border rounded-md"
            placeholder="iyzico refund ID (opsiyonel)"
            value={iyzicoRefundId}
            onChange={(e) => setIyzicoRefundId(e.target.value)}
          />
          <Button
            onClick={() => callAction('mark_refunded')}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? 'İşaretleniyor...' : '💸 İade Tamamlandı Olarak İşaretle'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aksiyon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <div className="text-red-700 text-sm">{error}</div> : null}

        <div className="border rounded p-3 space-y-2 bg-green-50">
          <p className="font-medium text-green-900">✅ Onayla</p>
          <p className="text-xs text-green-800">
            Onayda: satıcı henüz ödenmemişse pending bakiyeden düşülür. Sonra iyzico'dan müşteriye
            para iadesi yapılmalı.
          </p>
          <textarea
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Admin notu (opsiyonel)"
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <Button
            onClick={() => callAction('approve')}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? 'İşleniyor...' : 'Onayla'}
          </Button>
        </div>

        <div className="border rounded p-3 space-y-2 bg-red-50">
          <p className="font-medium text-red-900">❌ Reddet</p>
          <textarea
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Red gerekçesi (zorunlu)"
            rows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
          <Button
            variant="destructive"
            onClick={() => callAction('reject')}
            disabled={submitting || rejectionReason.length < 5}
          >
            {submitting ? 'İşleniyor...' : 'Reddet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
