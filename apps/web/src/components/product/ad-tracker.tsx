'use client'

import { hasConsent } from '@/lib/privacy/consent'
import { useConsent } from '@/lib/privacy/use-consent'
import { useEffect, useRef } from 'react'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('_ng_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_ng_sid', sid)
  }
  return sid
}

async function logAdEvent(
  campaign_id: string,
  event_type: 'impression' | 'click',
  product_id?: string
) {
  if (!hasConsent('analytics')) return
  try {
    await fetch('/api/ad-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id, product_id, event_type, session_id: getSessionId() }),
    })
  } catch {}
}

export function AdTracker({
  campaignId,
  productId,
  children,
}: {
  campaignId: string
  productId: string
  children: React.ReactNode
}) {
  const allowed = useConsent('analytics')
  const fired = useRef(false)

  useEffect(() => {
    if (!allowed || fired.current) return
    fired.current = true
    void logAdEvent(campaignId, 'impression', productId)
  }, [campaignId, productId, allowed])

  return (
    <div onClick={() => void logAdEvent(campaignId, 'click', productId)}>
      {children}
    </div>
  )
}
