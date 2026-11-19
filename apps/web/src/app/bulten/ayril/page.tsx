'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@novagross/ui'
function Unsubscribe() {
  const params = useSearchParams()
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [message, setMessage] = useState('')
  async function unsubscribe() {
    setBusy(true)
    try {
      const response = await fetch('/api/newsletter/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.get('token') }) })
      const result = await response.json(); setMessage(result.message || result.error); setDone(response.ok)
    } catch { setMessage('Bağlantı kurulamadı. Tekrar deneyebilirsiniz.') } finally { setBusy(false) }
  }
  return <div className="container max-w-lg py-16 space-y-5"><h1 className="text-2xl font-bold">E-posta Tercihi</h1><p>Novagross pazarlama e-postalarını kapatabilirsiniz. Hesabınıza giriş yapmanız gerekmez.</p><p role="status">{message}</p>{!done && <Button disabled={busy || !params.get('token')} onClick={unsubscribe}>{busy ? 'İşleniyor…' : 'Pazarlama e-postalarını kapat'}</Button>}</div>
}
export default function Page() { return <Suspense><Unsubscribe /></Suspense> }
