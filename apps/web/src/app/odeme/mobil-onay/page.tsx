'use client'
import { Suspense, useEffect, useState } from 'react'
import { Button } from '@novagross/ui'
import { CheckoutDocuments } from '@/components/legal/checkout-documents'
import type { CheckoutDocument } from '@/lib/agreements/checkout-document'
function MobileReview() {
  const [ticket, setTicket] = useState<string | null>(null)
  useEffect(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get('ticket')
    if (!value) return
    setTicket(value)
    history.replaceState(history.state, '', location.pathname)
  }, [])
  const [document, setDocument] = useState<CheckoutDocument | null>(null), [token, setToken] = useState(''), [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function send(action: 'prepare' | 'initialize') {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/payment/mobile-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, action, agreements: action === 'initialize' ? { mesafeli_satis: accepted, on_bilgilendirme: accepted, version: document?.version, documentToken: token } : undefined }) })
      const data = await response.json()
      if (!response.ok) { if (data.code === 'AGREEMENT_REFRESH_REQUIRED') { setDocument(null); setToken(''); setAccepted(false) }; throw new Error(data.error || 'İşlem tamamlanamadı') }
      if (action === 'prepare') { setDocument(data.document); setToken(data.documentToken); setAccepted(false) }
      else if (typeof data.paymentPageUrl === 'string' && data.paymentPageUrl.startsWith('https://')) location.assign(data.paymentPageUrl)
      else throw new Error('Güvenli ödeme sayfası alınamadı.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Bağlantı kurulamadı') } finally { setBusy(false) }
  }
  useEffect(() => { if (ticket) void send('prepare') }, [ticket])
  return <div className="container max-w-3xl py-8 space-y-5"><h1 className="text-2xl font-bold">Sipariş Belgeleri ve Ödeme</h1>{error && <p role="alert" className="text-destructive">{error}</p>}{document && <><CheckoutDocuments document={document}/><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1"/><span>Yukarıdaki siparişe özel Ön Bilgilendirme Formu ile bilgilendirildim ve Mesafeli Satış Sözleşmesi’ni okudum, kabul ediyorum.</span></label><Button disabled={!accepted || busy} onClick={() => send('initialize')}>{busy ? 'Hazırlanıyor…' : 'Güvenli Ödeme Formunu Aç'}</Button></>}{!document && <Button disabled={busy || !ticket} onClick={() => send('prepare')}>{busy ? 'Belgeler hazırlanıyor…' : 'Belgeleri Yeniden Hazırla'}</Button>}<p className="text-sm text-muted-foreground">Ödeme bu adımda tahsil edilmez. Kart bilgileriniz sonraki iyzico sayfasında girilir.</p></div>
}
export default function Page() { return <Suspense><MobileReview /></Suspense> }
