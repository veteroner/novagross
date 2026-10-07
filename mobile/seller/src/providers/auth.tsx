import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { registerForPush, unregisterPush } from '@/lib/push'

export type StoreRole = 'owner' | 'manager' | 'staff'
export type SellerStore = { storeId: string; storeName: string; role: StoreRole }

type AuthState = {
  loading: boolean
  session: Session | null
  store: SellerStore | null
  /** Giriş yapmış ama satıcı/mağaza üyesi değil */
  notSeller: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

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
    if (st) registerForPush().then((r) => !r.ok && console.log('[push]', r.reason))
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
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, session, store, notSeller, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı')
  return ctx
}
