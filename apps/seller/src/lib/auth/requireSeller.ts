import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isTwoFactorEnabled, verifyToken, TWO_FA_COOKIE } from './two-factor'

export type StoreRole = 'owner' | 'manager' | 'staff'

export type SellerResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  storeId: string
  storeName: string
  role: StoreRole
}

const ROLE_RANK: Record<StoreRole, number> = { staff: 1, manager: 2, owner: 3 }

/** Rol >= minimum mu? (owner > manager > staff) */
export function roleAtLeast(role: StoreRole, min: StoreRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
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

  // Mağazayı üyelik üzerinden çöz (sahip + yönetici + personel).
  // get_my_store() en yüksek rollü üyeliği döner (Faz 1: tek mağaza).
  const { data: membership } = await (supabase as any).rpc('get_my_store')
  const myStore = Array.isArray(membership) ? membership[0] : membership
  if (!myStore?.store_id) {
    redirect('/login?error=no_store')
  }
  const role = (myStore.role as StoreRole) || 'staff'

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', myStore.store_id)
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
    role,
  }
}

/**
 * Belirli bir minimum rol gerektiren sayfalar için guard (finans/pazarlama).
 * Personel finans/pazarlama sayfalarına URL'den erişmeye çalışırsa ana sayfaya döner.
 */
export async function requireSellerRole(
  minRole: StoreRole,
  redirectTo: string = '/'
): Promise<SellerResult> {
  const result = await requireSeller(redirectTo)
  if (!roleAtLeast(result.role, minRole)) {
    redirect('/?error=insufficient_role')
  }
  return result
}
