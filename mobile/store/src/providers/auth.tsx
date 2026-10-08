import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { registerForPush, unregisterPush } from '@/lib/push'
import { webApi } from '@/lib/api'

// Ürünler girişsiz gezilir; sepet/favori/ödeme/hesap girişle (karar: girişsiz satın alma yok).

export type Profile = { first_name: string | null; last_name: string | null; phone: string | null; email: string | null }

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (p: { firstName: string; lastName: string; email: string; password: string }) => Promise<string | null>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Web register-form / translateAuthError ile aynı mesajlar
function tr(msg: string) {
  if (msg === 'Invalid login credentials') return 'E-posta veya şifre hatalı.'
  if (/already registered/i.test(msg)) return 'Bu e-posta ile kayıtlı bir hesap var.'
  if (/Email not confirmed/i.test(msg)) return 'E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu kontrol edin.'
  if (/Password should be at least/i.test(msg)) return 'Şifre en az 6 karakter olmalı.'
  if (/banned/i.test(msg)) return 'Bu hesap kapatılmış.'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = async (s: Session | null) => {
    if (!s) return setProfile(null)
    const { data } = await supabase.from('profiles').select('first_name, last_name, phone, email').eq('id', s.user.id).maybeSingle()
    setProfile((data as any) ?? { first_name: null, last_name: null, phone: null, email: s.user.email ?? null })
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      if (data.session) registerForPush().then((r) => !r.ok && console.log('[push]', r.reason))
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') {
        loadProfile(s)
        registerForPush().then((r) => !r.ok && console.log('[push]', r.reason))
      }
      if (event === 'SIGNED_OUT') setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? tr(error.message) : null
  }

  const signUp: AuthState['signUp'] = async ({ firstName, lastName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
    })
    if (error) return tr(error.message)
    if (!data.session) return 'Kayıt tamamlandı. E-postanıza gelen doğrulama bağlantısına tıklayıp giriş yapın.'
    return null
  }

  const signOut = async () => {
    await unregisterPush()
    await supabase.auth.signOut()
  }

  const deleteAccount = async () => {
    try {
      await webApi('/api/account/delete', { method: 'POST' })
      await unregisterPush()
      await supabase.auth.signOut()
      return null
    } catch (e: any) {
      return e.message || 'Hesap silinemedi'
    }
  }

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, signIn, signUp, signOut, deleteAccount, refreshProfile: () => loadProfile(session) }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı')
  return ctx
}
