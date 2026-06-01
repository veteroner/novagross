'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { submitInfluencerApplication } from './actions'

export function ApplyForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    social_platform: 'instagram',
    social_handle: '',
    follower_count: '',
    bio: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await submitInfluencerApplication({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          social_platform: form.social_platform,
          social_handle: form.social_handle,
          follower_count: form.follower_count
            ? Number(form.follower_count)
            : null,
          bio: form.bio || null,
        })
        setSuccess(true)
      } catch (err: any) {
        setError(err?.message ?? 'Başvuru gönderilemedi.')
      }
    })
  }

  if (success) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Başvurunuz alındı</h3>
        <p className="text-sm text-gray-600">
          Ekibimiz 2 iş günü içinde size dönüş yapacaktır.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ad Soyad *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-posta *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefon</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Platform *</label>
          <select
            value={form.social_platform}
            onChange={(e) =>
              setForm({ ...form, social_platform: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="x">X (Twitter)</option>
            <option value="other">Diğer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Kullanıcı Adı *
          </label>
          <input
            required
            value={form.social_handle}
            onChange={(e) =>
              setForm({ ...form, social_handle: e.target.value })
            }
            placeholder="@kullaniciadi"
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Takipçi Sayısı</label>
          <input
            type="number"
            min="0"
            value={form.follower_count}
            onChange={(e) =>
              setForm({ ...form, follower_count: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Hakkınızda / İçerik Tipi
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Hangi konularda içerik üretiyorsunuz?"
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center w-full md:w-auto px-6 py-2.5 rounded-md bg-pink-600 hover:bg-pink-700 text-white font-medium disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Başvuruyu Gönder
      </button>
    </form>
  )
}
