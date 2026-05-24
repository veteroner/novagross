import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type SellerApiResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  storeId: string
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

    // Get their store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı' },
        { status: 404 }
      )
    }

    return { supabase, userId: user.id, storeId: store.id }
  } catch {
    return NextResponse.json(
      { error: 'Kimlik doğrulama hatası' },
      { status: 401 }
    )
  }
}
