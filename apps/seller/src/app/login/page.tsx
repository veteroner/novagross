'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@novagross/ui'
import { createBrowserClient } from '@supabase/ssr'
import { Store } from 'lucide-react'

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

      const { data: profile } = await supabase.from('profiles').select('is_seller').eq('id', user.id).single()
      if (!profile?.is_seller) {
        // Davet kabul akışı: henüz satıcı değil ama bir mağazaya davet edildiyse
        // davet linkine gitmesine izin ver. /davet sayfası e-posta eşleşmesiyle
        // üyeliği kurar ve is_seller'ı true yapar. 2FA'yı da atlar (kabul
        // sonrası normal girişte 2FA yine devreye girer).
        if (redirectTo && redirectTo.startsWith('/davet/')) {
          finish()
          return
        }
        await supabase.auth.signOut()
        throw new Error('Bu panel sadece onaylı satıcılar içindir. Başvurunuz onaylandıktan sonra giriş yapabilirsiniz.')
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

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
          <Store className="w-8 h-8" style={{ color: '#16A34A' }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-extrabold tracking-tight" style={{ color: '#16A34A' }}>{BRAND_NAME}</span>
          <span className="text-sm text-gray-500 font-medium">Satıcı Paneli</span>
        </div>
        <CardTitle className="text-xl mt-4">{step === 'otp' ? 'Doğrulama Kodu' : 'Giriş yap'}</CardTitle>
        {searchParams.get('reason') === 'timeout' && step === 'credentials' && (
          <p className="text-sm text-amber-600 mt-2">Oturumunuz zaman aşımına uğradı, tekrar giriş yapın.</p>
        )}
        {searchParams.get('error') === 'no_store' && step === 'credentials' && (
          <p className="text-sm text-red-600 mt-2">Hesabınıza bağlı bir mağaza bulunamadı.</p>
        )}
      </CardHeader>
      <CardContent>
        {step === 'credentials' ? (
          <form onSubmit={onSubmitCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="satici@email.com" required autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Şifre</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Beni hatırla (2 gün açık kal)
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#16A34A' }} disabled={submitting}>
              {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </Button>
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
            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full text-white" style={{ backgroundColor: '#16A34A' }} disabled={submitting || code.length !== 6}>
              {submitting ? 'Doğrulanıyor…' : 'Doğrula ve Giriş Yap'}
            </Button>
            <button type="button" onClick={sendCode} className="text-sm text-gray-500 hover:underline w-full text-center">
              Kodu tekrar gönder
            </button>
          </form>
        )}

        {step === 'credentials' && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Henüz satıcı değil misiniz?{' '}
              <a href={process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'} className="font-medium hover:underline" style={{ color: '#16A34A' }}>
                Satıcı başvurusu yapın
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SellerLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-gray-50 p-4">
      <Suspense fallback={<Card className="w-full max-w-md"><CardContent className="p-8 text-center">Yükleniyor...</CardContent></Card>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
