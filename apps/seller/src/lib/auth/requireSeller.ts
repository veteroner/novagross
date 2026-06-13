import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isTwoFactorEnabled, verifyToken, TWO_FA_COOKIE } from './two-factor'

export type SellerResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  storeId: string
  storeName: string
}

/**
 * Guard for seller dashboard pages.
 * Redirects to /login if not authenticated or not a seller / no store.
 */
export async function requireSeller(redirectTo: string = '/'): Promise<SellerResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_seller')
    .eq('id', user.id)
    .single()

  if (!profile?.is_seller) {
    redirect('/login?error=not_seller')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    redirect('/login?error=no_store')
  }

  // 2FA zorunluluğu (kill-switch ile kontrol edilir)
  if (isTwoFactorEnabled()) {
    const cookieStore = await cookies()
    const token = cookieStore.get(TWO_FA_COOKIE)?.value
    if (!verifyToken(token, user.id)) {
      redirect(`/login?step=2fa&redirect=${encodeURIComponent(redirectTo)}`)
    }
  }

  return {
    supabase,
    userId: user.id,
    storeId: store.id,
    storeName: store.store_name,
  }
}
