'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@novagross/ui'
import { createBrowserClient } from '@supabase/ssr'
import { Store } from 'lucide-react'

function safeRedirectPath(pathname: string | null) {
  if (!pathname) return '/'
  if (!pathname.startsWith('/')) return '/'
  if (pathname.startsWith('//')) return '/'
  return pathname
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = useMemo(() => safeRedirectPath(searchParams.get('redirect')), [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_seller')
        .eq('id', user.id)
        .single()

      const isSeller = Boolean(profile?.is_seller)

      // Only sellers can access this panel
      if (!isSeller) {
        await supabase.auth.signOut()
        throw new Error('Bu panel sadece onaylı satıcılar içindir. Satıcı başvurunuz onaylandıktan sonra giriş yapabilirsiniz.')
      }

      router.push(redirectTo || '/')
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Giriş yapılamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}
        >
          <Store className="w-8 h-8" style={{ color: '#16A34A' }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: '#16A34A' }}
          >
            {BRAND_NAME}
          </span>
          <span className="text-sm text-gray-500 font-medium">Satıcı Paneli</span>
        </div>
        <CardTitle className="text-xl mt-4">Giriş yap</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {BRAND_NAME} Marketplace satıcı girişi
        </p>
        {(searchParams.get('error') === 'not-seller' ||
          searchParams.get('error') === 'not_seller') && (
          <p className="text-sm text-red-600 mt-2">
            Bu panel sadece onaylı satıcılar içindir.
          </p>
        )}
        {searchParams.get('error') === 'no_store' && (
          <p className="text-sm text-red-600 mt-2">
            Hesabınıza bağlı bir mağaza bulunamadı.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="satici@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: '#16A34A' }}
            disabled={submitting}
          >
            {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Henüz satıcı değil misiniz?{' '}
            <a
              href={process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'}
              className="font-medium hover:underline"
              style={{ color: '#16A34A' }}
            >
              Satıcı başvurusu yapın
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SellerLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-gray-50 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">Yükleniyor...</CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
