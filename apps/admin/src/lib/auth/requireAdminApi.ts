import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AdminApiResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: 'admin' | 'super_admin'
}

/**
 * Guard for admin API routes.
 * Returns an AdminApiResult on success or a NextResponse (401/403) on failure.
 * Usage:
 *   const auth = await requireAdminApi()
 *   if (auth instanceof NextResponse) return auth
 *   const { supabase, userId, role } = auth
 */
export async function requireAdminApi(): Promise<AdminApiResult | NextResponse> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return { supabase, userId: user.id, role }
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

/**
 * Guard for admin or seller API routes.
 * Returns user info on success or a NextResponse on failure.
 */
export async function requireAdminOrSellerApi(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: string; isSeller: boolean }
  | NextResponse
> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_seller')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'user'
    const isSeller = Boolean(profile?.is_seller)

    if (role !== 'admin' && role !== 'super_admin' && !isSeller) {
      return NextResponse.json(
        { error: 'Admin or seller access required' },
        { status: 403 }
      )
    }

    return { supabase, userId: user.id, role, isSeller }
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
