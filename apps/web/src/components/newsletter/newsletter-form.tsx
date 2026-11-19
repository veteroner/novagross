'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui'
import Link from 'next/link'
import { MARKETING_TEXT, MARKETING_VERSION } from '@/lib/privacy/marketing'
import { toast } from '@/components/ui/toast'
import { apiFetch, getErrorMessage, retryApiCall } from '@/lib/api-error-handler'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [kvkkConsent, setKvkkConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast.error('Geçerli bir e-posta adresi girin')
      return
    }

    if (!kvkkConsent) {
      toast.error('Bültene abone olmak için e-posta ileti iznini işaretleyin')
      return
    }

    setLoading(true)

    try {
      // Retry up to 3 times on network errors
      const data = await retryApiCall(
        () => apiFetch<{ message: string }>('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, consent: kvkkConsent, version: MARKETING_VERSION }),
        }),
        2 // Max 2 retries (3 total attempts)
      )

      toast.success(data.message || 'Bültene başarıyla abone oldunuz!')
      setEmail('')
      setKvkkConsent(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresin"
            className="min-w-0 flex-1 px-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground"
            disabled={loading}
            required
            autoComplete="email"
          />
          <Button variant="secondary" type="submit" disabled={loading}>
            {loading ? 'Gönderiliyor...' : 'Abone Ol'}
          </Button>
        </div>

        <p className="text-xs text-white/90">E-posta adresinizin kullanımı hakkında <Link href="/kvkk" target="_blank" className="underline">KVKK Aydınlatma Metni</Link>’ni inceleyebilirsiniz.</p>
        <label className="flex items-start gap-3 text-sm text-white text-left"><input aria-label="E-posta bülteni ileti izni" type="checkbox" checked={kvkkConsent} onChange={e => setKvkkConsent(e.target.checked)} required className="mt-1 shrink-0"/><span>{MARKETING_TEXT}</span></label>
      </form>
    </div>
  )
}
