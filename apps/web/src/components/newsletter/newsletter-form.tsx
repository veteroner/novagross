'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui'
import { KVKKConsent } from '@/components/kvkk-consent'
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
      toast.error('KVKK onayını kabul etmelisiniz')
      return
    }

    setLoading(true)

    try {
      // Retry up to 3 times on network errors
      const data = await retryApiCall(
        () => apiFetch<{ message: string }>('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
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
            className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground"
            disabled={loading}
            required
            autoComplete="email"
          />
          <Button variant="secondary" type="submit" disabled={loading}>
            {loading ? 'Gönderiliyor...' : 'Abone Ol'}
          </Button>
        </div>

        <KVKKConsent
          checked={kvkkConsent}
          onChange={setKvkkConsent}
          variant="newsletter"
          required
        />
      </form>
    </div>
  )
}
