'use client'

import { useState, useTransition } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { markOrderRefundedManually, retryOrderRefund } from './refund-actions'

const LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: 'İade sırada (2 dk içinde işlenir)', cls: 'bg-yellow-100 text-yellow-800' },
  processing: { text: 'iyzico iadesi yapılıyor', cls: 'bg-blue-100 text-blue-800' },
  refunded: { text: 'İade edildi', cls: 'bg-green-100 text-green-800' },
  failed: { text: 'İade başarısız', cls: 'bg-red-100 text-red-800' },
}
const METHODS: Record<string, string> = {
  cancel: 'iyzico ödeme iptali',
  refund: 'iyzico kalem iadesi',
  manual: 'iyzico panelinden elle',
}

export function RefundCard({
  orderId,
  refundStatus,
  refundMethod,
  refundAmount,
  refundedAt,
  refundError,
  attempts,
  lastAttemptAt,
}: {
  orderId: string
  refundStatus: string
  refundMethod: string | null
  refundAmount: number | null
  refundedAt: string | null
  refundError: string | null
  attempts: number
  lastAttemptAt: string | null
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const label = LABELS[refundStatus] ?? { text: refundStatus, cls: 'bg-gray-100 text-gray-800' }
  // 'processing' 15 dk'dan uzun sürdüyse takılmıştır (çökme) — iyzico'yu kontrol edip yeniden dene
  const stuck =
    refundStatus === 'processing' && lastAttemptAt && Date.now() - new Date(lastAttemptAt).getTime() > 15 * 60 * 1000

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setMsg(null)
      try {
        await fn()
        setMsg('Kaydedildi')
      } catch (e: any) {
        setMsg(e.message || 'İşlem başarısız')
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Müşteri iadesi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${label.cls}`}>{label.text}</span>
        {refundStatus === 'refunded' ? (
          <div className="space-y-1">
            <div>
              {formatPrice(refundAmount ?? 0)} · {refundMethod ? METHODS[refundMethod] ?? refundMethod : ''}
            </div>
            <div className="text-muted-foreground">{refundedAt ? new Date(refundedAt).toLocaleString('tr-TR') : ''}</div>
          </div>
        ) : (
          <>
            <div className="text-muted-foreground">Deneme: {attempts}/5</div>
            {refundError ? <div className="rounded bg-red-50 p-2 text-red-800 break-words">{refundError}</div> : null}
            {refundStatus === 'failed' || stuck ? (
              <div className="flex flex-col gap-2">
                <Button variant="outline" disabled={pending} onClick={() => run(() => retryOrderRefund(orderId))}>
                  Yeniden dene
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    const note = window.prompt(
                      'iyzico panelinden bu siparişi elle iade ettiyseniz onaylayın. Not (isteğe bağlı):',
                      ''
                    )
                    if (note === null) return
                    run(() => markOrderRefundedManually(orderId, note))
                  }}
                >
                  iyzico&apos;da elle iade ettim
                </Button>
                <p className="text-xs text-muted-foreground">
                  &quot;Elle iade ettim&quot; yalnızca sistemi günceller; para iadesi iyzico panelinden yapılmış olmalı.
                </p>
              </div>
            ) : null}
          </>
        )}
        {msg ? <div className="text-xs">{msg}</div> : null}
      </CardContent>
    </Card>
  )
}
