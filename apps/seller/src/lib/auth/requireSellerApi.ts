import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type StoreRole = 'owner' | 'manager' | 'staff'

export type SellerApiResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  storeId: string
  role: StoreRole
}

const ROLE_RANK: Record<StoreRole, number> = { staff: 1, manager: 2, owner: 3 }

export function apiRoleAtLeast(role: StoreRole, min: StoreRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/**
 * Guard for seller API routes.
 * Returns seller info on success or a NextResponse (401/403) on failure.
 */
export async function requireSellerApi(): Promise<SellerApiResult | NextResponse> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_seller')
      .eq('id', user.id)
      .single()

    const isSeller = Boolean(profile?.is_seller)

    if (!isSeller) {
      return NextResponse.json(
        { error: 'Satıcı erişimi gerekli' },
        { status: 403 }
      )
    }

    // Mağazayı üyelik üzerinden çöz (sahip/yönetici/personel)
    const { data: membership } = await (supabase as any).rpc('get_my_store')
    const myStore = Array.isArray(membership) ? membership[0] : membership

    if (!myStore?.store_id) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı' },
        { status: 404 }
      )
    }

    return {
      supabase,
      userId: user.id,
      storeId: myStore.store_id,
      role: (myStore.role as StoreRole) || 'staff',
    }
  } catch {
    return NextResponse.json(
      { error: 'Kimlik doğrulama hatası' },
      { status: 401 }
    )
  }
}
