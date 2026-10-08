import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'
import { registerForPush, unregisterPush } from '@/lib/push'
import { sellerApi } from '@/lib/api'

export type StoreRole = 'owner' | 'manager' | 'staff'
export type SellerStore = { storeId: string; storeName: string; role: StoreRole }

type AuthState = {
  loading: boolean
  session: Session | null
  store: SellerStore | null
  /** Giriş yapmış ama satıcı/mağaza üyesi değil */
  notSeller: boolean
  /** İki adımlı doğrulama (web satıcı paneliyle aynı: e-postaya 6 haneli kod) */
  twoFactor: 'checking' | 'required' | 'ok'
  sendTwoFactorCode: () => Promise<string | null>
  verifyTwoFactor: (code: string, remember: boolean) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// apps/seller api/2fa/verify'ın döndürdüğü imzalı token (2 saat / "beni hatırla" 2 gün)
const twoFaKey = (userId: string) => `ng_2fa_${userId}`

async function hasValidTwoFa(userId: string) {
  try {
    const raw = await SecureStore.getItemAsync(twoFaKey(userId))
    if (!raw) return false
    const { expiresAt } = JSON.parse(raw)
    return Number(expiresAt) > Date.now()
  } catch {
    return false
  }
}

async function loadStore(): Promise<SellerStore | null> {
  // Web satıcı paneliyle aynı: üyelik üzerinden mağaza (sahip/yönetici/personel)
  const { data } = await (supabase as any).rpc('get_my_store')
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.store_id) return null
  const { data: s } = await supabase.from('stores').select('store_name').eq('id', row.store_id).maybeSingle()
  return { storeId: row.store_id, storeName: (s as any)?.store_name ?? 'Mağazam', role: (row.role as StoreRole) || 'staff' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [store, setStore] = useState<SellerStore | null>(null)
  const [notSeller, setNotSeller] = useState(false)
  const [twoFactor, setTwoFactor] = useState<AuthState['twoFactor']>('checking')

  const sendTwoFactorCode = async () => {
    try {
      const r = await sellerApi<{ ok?: boolean; skipped?: boolean }>('/api/2fa/send', { method: 'POST' })
      if (r.skipped) setTwoFactor('ok') // sunucuda 2FA kapalı (TWO_FACTOR_ENABLED)
      return null
    } catch (e: any) {
      return e.message || 'Kod gönderilemedi'
    }
  }

  const verifyTwoFactor = async (code: string, remember: boolean) => {
    try {
      const r = await sellerApi<{ ok: boolean; skipped?: boolean; token?: string; expiresAt?: number }>('/api/2fa/verify', {
        method: 'POST',
        body: { code, remember },
      })
      const uid = session?.user.id
      if (uid && r.token && r.expiresAt) {
        await SecureStore.setItemAsync(twoFaKey(uid), JSON.stringify({ token: r.token, expiresAt: r.expiresAt }))
      }
      setTwoFactor('ok')
      registerForPush().then((x) => !x.ok && console.log('[push]', x.reason))
      return null
    } catch (e: any) {
      return e.message || 'Doğrulama başarısız'
    }
  }

  const resolve = async (s: Session | null) => {
    setSession(s)
    if (!s) {
      setStore(null)
      setNotSeller(false)
      return
    }
    const st = await loadStore()
    setStore(st)
    setNotSeller(!st)
    if (!st) return

    if (await hasValidTwoFa(s.user.id)) {
      setTwoFactor('ok')
      registerForPush().then((r) => !r.ok && console.log('[push]', r.reason))
      return
    }
    // Kod iste; sunucuda 2FA kapalıysa { skipped } döner ve doğrudan geçilir
    setTwoFactor('checking')
    try {
      const r = await sellerApi<{ skipped?: boolean }>('/api/2fa/send', { method: 'POST' })
      if (r.skipped) {
        setTwoFactor('ok')
        registerForPush().then((x) => !x.ok && console.log('[push]', x.reason))
      } else setTwoFactor('required')
    } catch {
      setTwoFactor('required')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      await resolve(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') resolve(s)
      else setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : error.message
    return null
  }

  const signOut = async () => {
    await unregisterPush()
    if (session?.user.id) await SecureStore.deleteItemAsync(twoFaKey(session.user.id)).catch(() => {})
    setTwoFactor('checking')
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, session, store, notSeller, twoFactor, sendTwoFactorCode, verifyTwoFactor, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı')
  return ctx
}
