'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@novagross/ui'
import { MARKETING_TEXT } from '@/lib/privacy/marketing'
function Confirm() {
  const params = useSearchParams()
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [message, setMessage] = useState('')
  async function confirm() {
    setBusy(true)
    try {
      const response = await fetch('/api/newsletter/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.get('token') }) })
      const data = await response.json()
      setMessage(data.message || data.error)
      setDone(response.ok)
    } catch { setMessage('Bağlantı kurulamadı. Lütfen tekrar deneyin.') } finally { setBusy(false) }
  }
  return <div className="container max-w-xl py-16 space-y-5"><h1 className="text-2xl font-bold">E-posta Bülteni Onayı</h1><p>{MARKETING_TEXT}</p><p role="status">{message}</p>{!done && <Button disabled={busy || !params.get('token')} onClick={confirm}>{busy ? 'İşleniyor…' : 'E-posta aboneliğimi onaylıyorum'}</Button>}</div>
}
export default function Page() { return <Suspense><Confirm /></Suspense> }
