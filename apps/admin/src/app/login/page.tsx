'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@novagross/ui'
import { createBrowserClient } from '@supabase/ssr'

const TWO_FA_ENABLED = process.env.NEXT_PUBLIC_TWO_FACTOR_ENABLED === 'true'

function safeRedirectPath(pathname: string | null) {
  if (!pathname) return '/'
  if (!pathname.startsWith('/')) return '/'
  if (pathname.startsWith('//')) return '/'
  return pathname
}

function setSessionPolicy(remember: boolean) {
  try {
    localStorage.setItem('_ng_remember', remember ? '1' : '0')
    localStorage.setItem('_ng_last_activity', String(Date.now()))
  } catch {}
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = useMemo(() => safeRedirectPath(searchParams.get('redirect')), [searchParams])

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const sendCode = useCallback(async () => {
    setInfo(null)
    const res = await fetch('/api/2fa/send', { method: 'POST' })
    if (res.ok) setInfo('Doğrulama kodu e-postanıza gönderildi.')
    else {
      const d = await res.json().catch(() => ({}))
      setError(d?.error || 'Kod gönderilemedi.')
    }
  }, [])

  // requireAdmin 2FA için yönlendirdiyse (step=2fa) ve oturum varsa kodu gönder
  useEffect(() => {
    if (!TWO_FA_ENABLED) return
    if (searchParams.get('step') !== '2fa') return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setStep('otp')
        await sendCode()
      }
    })()
  }, [searchParams, supabase, sendCode])

  const finish = () => {
    setSessionPolicy(remember)
    router.push(redirectTo || '/')
    router.refresh()
  }

  const onSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_seller')
        .eq('id', user.id)
        .single()

      const role = profile?.role
      if (role !== 'admin' && role !== 'super_admin') {
        await supabase.auth.signOut()
        if (profile?.is_seller) {
          throw new Error('Satıcı paneline seller.novagross.com adresinden giriş yapabilirsiniz.')
        }
        throw new Error('Bu hesabın admin panel erişimi yok.')
      }

      if (TWO_FA_ENABLED) {
        setStep('otp')
        await sendCode()
      } else {
        finish()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Giriş yapılamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, remember }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Doğrulama başarısız.')
      finish()
    } catch (err: any) {
      setError(err?.message ?? 'Doğrulama başarısız.')
    } finally {
      setSubmitting(false)
    }
  }

  const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Novagross'
  const SELLER_URL = process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-extrabold tracking-tight" style={{ color: '#FF6000' }}>
            {BRAND_NAME}
          </span>
          <span className="text-sm text-gray-500 font-medium">Admin Paneli</span>
        </div>
        <CardTitle className="mt-4 text-xl">{step === 'otp' ? 'Doğrulama Kodu' : 'Giriş yap'}</CardTitle>
        {searchParams.get('reason') === 'timeout' && step === 'credentials' && (
          <p className="text-sm text-amber-600 mt-2">Oturumunuz zaman aşımına uğradı, tekrar giriş yapın.</p>
        )}
      </CardHeader>
      <CardContent>
        {step === 'credentials' ? (
          <form onSubmit={onSubmitCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">E-posta</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@domain.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Şifre</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Beni hatırla (2 gün açık kal)
            </label>

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#FF6000' }} disabled={submitting}>
              {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </Button>

            <p className="text-sm text-center text-gray-500 mt-4">
              Satıcı mısınız?{' '}
              <a href={SELLER_URL} className="font-medium hover:underline" style={{ color: '#FF6000' }}>
                Satıcı Paneline git →
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <p className="text-sm text-gray-600">E-postanıza gönderilen 6 haneli kodu girin.</p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em]"
              required
              autoFocus
            />
            {info && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{info}</div>}
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#FF6000' }} disabled={submitting || code.length !== 6}>
              {submitting ? 'Doğrulanıyor…' : 'Doğrula ve Giriş Yap'}
            </Button>
            <button type="button" onClick={sendCode} className="text-sm text-gray-500 hover:underline w-full text-center">
              Kodu tekrar gönder
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-gray-50 p-4">
      <Suspense fallback={<Card className="w-full max-w-md shadow-xl"><CardContent className="p-8 text-center">Yükleniyor...</CardContent></Card>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
