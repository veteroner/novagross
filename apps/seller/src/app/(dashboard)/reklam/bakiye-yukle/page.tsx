'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, PageHeader } from '@novagross/ui'
import { ArrowLeft, Loader2, Wallet } from 'lucide-react'

const QUICK = [100, 250, 500, 1000]

export default function TopUpPage() {
  const [amount, setAmount] = useState('250')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formContent, setFormContent] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const start = async () => {
    const amt = Math.floor(Number(amount))
    if (!amt || amt < 50) {
      setError('En az 50 ₺ yükleyebilirsiniz.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ad-balance/initialize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Ödeme başlatılamadı.')
      setFormContent(data.checkoutFormContent)
    } catch (e: any) {
      setError(e?.message || 'Hata')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (formContent && formRef.current) {
      formRef.current.innerHTML = formContent
      const added: HTMLScriptElement[] = []
      formRef.current.querySelectorAll('script').forEach((script) => {
        const s = document.createElement('script')
        if (script.src) s.src = script.src
        else s.textContent = script.textContent
        document.body.appendChild(s)
        added.push(s)
      })
      return () => added.forEach((s) => s.remove())
    }
  }, [formContent])

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/reklam" className="inline-flex items-center text-sm text-muted-foreground hover:text-orange-700">
        <ArrowLeft className="h-4 w-4 mr-1" /> Reklam
      </Link>

      <PageHeader title="Reklam Bakiyesi Yükle" description="Kartınızla güvenli ödeme (iyzico) ile reklam bakiyesi yükleyin." />

      {!formContent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-600" /> Yükleme Tutarı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${Number(amount) === q ? 'bg-orange-600 text-white border-orange-600' : 'bg-white'}`}
                >
                  ₺{q}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tutar (₺)</label>
              <Input type="number" min="50" max="100000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Min 50 ₺ · Maks 100.000 ₺</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={start} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ödemeye Geç'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div ref={formRef} id="iyzipay-checkout-form" className="responsive" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
