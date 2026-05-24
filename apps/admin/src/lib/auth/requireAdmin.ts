import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return { supabase, userId: user.id, role }
}
