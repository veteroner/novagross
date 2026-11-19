'use client'
import { useEffect, useState } from 'react'
import { Button } from '@novagross/ui'
export function ProductQuestions({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<{ id: string; question: string; answer: string }[]>([]), [question, setQuestion] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    fetch(`/api/products/${productId}/questions`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (active) setQuestions(data.questions || []) }).catch(() => { if (active) setMessage('Sorular şu anda yüklenemiyor. Daha sonra tekrar deneyebilirsiniz.') })
    return () => { active = false }
  }, [productId])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try { const response = await fetch(`/api/products/${productId}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }); const data = await response.json(); setMessage(data.message || data.error); if (response.ok) setQuestion('') } catch { setMessage('Bağlantı kurulamadı. Lütfen tekrar deneyin.') } finally { setBusy(false) }
  }
  return <section id="saticiya-sor" className="mt-12 space-y-5"><h2 className="text-2xl font-bold">Satıcıya Sor</h2><p className="text-sm text-muted-foreground">Ürün özellikleri ve uyumluluk hakkında soru sorabilirsiniz. Telefon, adres veya siparişe özel kişisel bilgilerinizi yazmayın. Sipariş talepleri için <a href="/yardim" className="underline">Yardım Merkezi</a>’ni kullanın.</p>{questions.map(item => <article key={item.id} className="rounded-lg border p-4 space-y-2"><p className="font-medium">Soru: {item.question}</p><p className="text-sm text-muted-foreground">Satıcı: {item.answer}</p></article>)}{!questions.length && <p className="text-sm text-muted-foreground">Henüz yayınlanmış soru ve yanıt yok.</p>}<form onSubmit={submit} className="space-y-3"><label htmlFor="product-question" className="block text-sm font-medium">Sorunuz</label><textarea id="product-question" value={question} onChange={e => setQuestion(e.target.value)} required minLength={10} maxLength={1000} className="min-h-24 w-full rounded-md border p-3"/><Button disabled={busy}>{busy ? 'Gönderiliyor…' : 'Soruyu Gönder'}</Button></form><p role="status" className="text-sm">{message}</p></section>
}
