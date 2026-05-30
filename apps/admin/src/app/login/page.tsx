'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@novagross/ui'
import { createBrowserClient } from '@supabase/ssr'

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

      // Get user role to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_seller')
        .eq('id', user.id)
        .single()

      const role = profile?.role
      const isSeller = Boolean(profile?.is_seller)

      // Admin-only access
      if (role !== 'admin' && role !== 'super_admin') {
        await supabase.auth.signOut()
        if (isSeller) {
          throw new Error('Satıcı paneline seller.trendikon.com adresinden giriş yapabilirsiniz.')
        }
        throw new Error('Bu hesabın admin panel erişimi yok.')
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
  const SELLER_URL = process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.trendikon.com'

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: '#FF6000' }}
          >
            {BRAND_NAME}
          </span>
          <span className="text-sm text-gray-500 font-medium">Admin Paneli</span>
        </div>
        <CardTitle className="mt-4 text-xl">Giriş yap</CardTitle>
        {searchParams.get('error') === 'unauthorized' && (
          <p className="text-sm text-red-600 mt-2">Bu hesabın panel erişimi yok.</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: '#FF6000' }}
            disabled={submitting}
          >
            {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>

          <p className="text-sm text-center text-gray-500 mt-4">
            Satıcı mısınız?{' '}
            <a href={SELLER_URL} className="font-medium hover:underline" style={{ color: '#FF6000' }}>
              Satıcı Paneline git →
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-gray-50 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="p-8 text-center">Yükleniyor...</CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
