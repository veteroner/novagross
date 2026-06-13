import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isTwoFactorEnabled, verifyToken, TWO_FA_COOKIE } from './two-factor'

type RequireAdminResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: 'admin' | 'super_admin'
}

function safeRedirectPath(pathname: string) {
  // We only ever redirect within this app.
  if (!pathname.startsWith('/')) return '/'
  if (pathname.startsWith('//')) return '/'
  return pathname
}

export async function requireAdmin(redirectTo: string = '/') : Promise<RequireAdminResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectPath = encodeURIComponent(safeRedirectPath(redirectTo))
    redirect(`/login?redirect=${redirectPath}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'admin' && role !== 'super_admin') {
    redirect('/login?error=unauthorized')
  }

  // 2FA zorunluluğu (kill-switch ile kontrol edilir)
  if (isTwoFactorEnabled()) {
    const cookieStore = await cookies()
    const token = cookieStore.get(TWO_FA_COOKIE)?.value
    if (!verifyToken(token, user.id)) {
      const redirectPath = encodeURIComponent(safeRedirectPath(redirectTo))
      redirect(`/login?step=2fa&redirect=${redirectPath}`)
    }
  }

  return { supabase, userId: user.id, role }
}
