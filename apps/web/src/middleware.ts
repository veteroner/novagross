import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration per endpoint
const RATE_LIMITS = {
  '/api/newsletter/subscribe': { max: 5, windowMs: 60000 }, // 5 requests per minute
  '/api/contact': { max: 3, windowMs: 60000 }, // 3 requests per minute
  '/api/cargo/track': { max: 10, windowMs: 60000 }, // 10 requests per minute
  '/api/seller/apply': { max: 3, windowMs: 300000 }, // 3 requests per 5 minutes
  '/api/auth/generate-otp': { max: 3, windowMs: 300000 }, // 3 requests per 5 minutes
  '/api/auth/verify-otp': { max: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  '/api/auth/send-verification': { max: 3, windowMs: 300000 }, // 3 requests per 5 minutes
  '/api/auth/forgot-password': { max: 3, windowMs: 300000 }, // 3 requests per 5 minutes — email enumeration
  '/api/auth/reset-password': { max: 5, windowMs: 300000 }, // 5 attempts per 5 minutes — token bruteforce
  '/api/auth/verify-email': { max: 5, windowMs: 300000 }, // 5 attempts per 5 minutes — token bruteforce
  '/api/email/send': { max: 5, windowMs: 60000 }, // 5 requests per minute
  '/api/affiliate/click': { max: 30, windowMs: 60000 }, // 30 click logs per minute — click fraud prevention
}

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`
}

function checkRateLimit(key: string, limit: { max: number; windowMs: number }): boolean {
  const now = Date.now()
  const record = rateLimit.get(key)

  if (!record || now > record.resetTime) {
    // New window
    rateLimit.set(key, { count: 1, resetTime: now + limit.windowMs })
    return true
  }

  if (record.count < limit.max) {
    record.count++
    return true
  }

  return false
}

function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetTime) {
      rateLimit.delete(key)
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 300000)
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Affiliate ?ref=KOD yakalama — cookie'ye 30 gün set et
  const refCode = searchParams.get('ref')
  if (refCode && /^[a-zA-Z0-9_-]{3,32}$/.test(refCode)) {
    const response = NextResponse.next()
    response.cookies.set('aff_ref', refCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 gün
      path: '/',
      sameSite: 'lax',
      httpOnly: true, // SECURITY: payment callback server-side okuyor; XSS sızıntısı engellendi
      secure: true,
    })
    // Click tracking — fire-and-forget arka planda
    try {
      const visitor = request.cookies.get('visitor_id')?.value ?? crypto.randomUUID()
      if (!request.cookies.get('visitor_id')) {
        response.cookies.set('visitor_id', visitor, {
          maxAge: 365 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        })
      }
      const base = request.nextUrl.origin
      fetch(`${base}/api/affiliate/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_code: refCode,
          visitor_id: visitor,
          landing_url: request.nextUrl.pathname,
          user_agent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        }),
      }).catch(() => {})
    } catch {}
    return response
  }

  // Check if this path needs rate limiting
  const rateLimitConfig = Object.entries(RATE_LIMITS).find(([path]) =>
    pathname.startsWith(path)
  )

  if (rateLimitConfig) {
    const [path, limit] = rateLimitConfig
    
    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const key = getRateLimitKey(ip, path)
    
    if (!checkRateLimit(key, limit)) {
      return NextResponse.json(
        { 
          error: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
          retryAfter: Math.ceil(limit.windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.windowMs / 1000)),
            'X-RateLimit-Limit': String(limit.max),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    }
  }

  // Continue with Supabase session update
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
