'use client'

import { useState } from 'react'
import { Button, Card } from '@novagross/ui'
import { KVKKConsent } from '@/components/kvkk-consent'
import { apiFetch, getErrorMessage, retryApiCall } from '@/lib/api-error-handler'

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [kvkkConsent, setKvkkConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!kvkkConsent) {
      setError('KVKK onayını kabul etmelisiniz')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    }

    try {
      // Retry up to 3 times on network errors
      await retryApiCall(
        () => apiFetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
        2 // Max 2 retries (3 total attempts)
      )
      
      setSubmitted(true)
      e.currentTarget.reset()
      setKvkkConsent(false)

      // 3 saniye sonra success mesajını gizle
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-semibold mb-6">Bize Ulaşın</h2>
      
      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Ad Soyad *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              E-posta *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2">
            Konu *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Mesajınız *
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
            disabled={isSubmitting}
          ></textarea>
        </div>

        <KVKKConsent
          checked={kvkkConsent}
          onChange={setKvkkConsent}
          variant="contact"
          required
        />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
        </Button>
      </form>
    </Card>
  )
}
