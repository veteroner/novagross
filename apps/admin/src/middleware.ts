import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

function safeRedirectPath(pathname: string) {
  if (!pathname.startsWith('/')) return '/'
  if (pathname.startsWith('//')) return '/'
  return pathname
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

// Cron/scheduled-function ile çağrılan route'lar: Netlify scheduled function'lar
// tarayıcı oturumu taşımaz, yalnızca `Authorization: Bearer <secret>` gönderir.
// Bu route'ların HER BİRİ kendi içinde secret'ı doğrular — middleware'in oturum
// zorunluluğu bunları asla geçmelerine izin vermez (session yoksa 401 verip
// route koduna hiç ulaşmaz), bu yüzden burada muaf tutulmaları GEREKİR.
const CRON_ROUTE_PREFIXES = [
  '/api/email/process-queue',
  '/api/iyzico/auto-approve',
  '/api/marketing/weekly-seller-insights',
  '/api/marketing/abandoned-cart-reminders',
  '/api/cargo/sync-shipment-status',
  '/api/cargo/reconcile-invoices',
  '/api/cargo/sync-delivery-problems',
  '/api/invoices/reminders',
]

function isCronRoute(pathname: string): boolean {
  return CRON_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()

  // Allow unauthenticated access to login and assets.
  if (url.pathname === '/login') return NextResponse.next()

  // Cron route'ları kendi Bearer secret kontrolünü yapar — oturum şartından muaf.
  if (isCronRoute(url.pathname)) return NextResponse.next()

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // API routes get JSON 401; pages get redirect to login
    if (isApiRoute(url.pathname)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const redirectTo = encodeURIComponent(safeRedirectPath(url.pathname + url.search))
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_seller')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const isSeller = Boolean(profile?.is_seller)

  // Admin-only: only admin/super_admin can access
  if (role !== 'admin' && role !== 'super_admin') {
    if (isApiRoute(url.pathname)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    // Redirect sellers to the standalone seller panel
    if (isSeller) {
      return NextResponse.redirect('https://seller.novagross.com')
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = '?error=unauthorized'
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
