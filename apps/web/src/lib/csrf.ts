// CSRF Protection Middleware Helper
// Simple origin check for API routes

import { NextRequest } from 'next/server'
import { getSiteUrlObject } from '@/lib/site-url'

function buildAllowedOrigins(): Set<string> {
  const siteOrigin = getSiteUrlObject().origin
  const origins = new Set<string>([
    siteOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
  ])

  // Allow www/non-www variations to avoid accidental 403s.
  try {
    const url = new URL(siteOrigin)
    if (url.hostname.startsWith('www.')) {
      origins.add(`${url.protocol}//${url.hostname.replace(/^www\./, '')}`)
    } else {
      origins.add(`${url.protocol}//www.${url.hostname}`)
    }
  } catch {
    // ignore
  }

  return origins
}

function requestOriginFromHeaders(request: NextRequest): string | null {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')

  if (forwardedProto && forwardedHost) {
    const host = forwardedHost.split(',')[0]?.trim()
    if (host) return `${forwardedProto}://${host}`
  }

  try {
    return request.nextUrl.origin
  } catch {
    return null
  }
}

function originFromHeader(value: string | null): string | null {
  const normalized = (value || '').trim()
  if (!normalized) return null

  // Some browsers/environments can send Origin: null
  if (normalized === 'null') return null
  try {
    return new URL(normalized).origin
  } catch {
    // If parsing fails, try treating it as a raw origin string.
    // Expected shape: "https://example.com" (no path/query)
    if (/^https?:\/\/[^/]+$/i.test(normalized)) return normalized
    return null
  }
}

function shouldDebugCsrf(): boolean {
  return process.env.CSRF_DEBUG === '1'
}

export function validateOrigin(request: NextRequest): boolean {
  const allowedOrigins = buildAllowedOrigins()

  const requestOrigin = requestOriginFromHeaders(request)
  if (requestOrigin) allowedOrigins.add(requestOrigin)

  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')
  const origin = originFromHeader(originHeader)
  const refererOrigin = originFromHeader(refererHeader)
  
  // Allow same-origin requests (explicit origin match) and local dev.
  const allowIfLocalhost = (originValue: string | null): boolean => {
    if (!originValue) return false
    try {
      const { hostname } = new URL(originValue)
      return hostname === 'localhost' || hostname === '127.0.0.1'
    } catch {
      return false
    }
  }

  if (allowIfLocalhost(origin) || allowIfLocalhost(refererOrigin) || allowIfLocalhost(requestOrigin)) {
    return true
  }

  if (origin && requestOrigin && origin === requestOrigin) {
    return true
  }

  if (refererOrigin && requestOrigin && refererOrigin === requestOrigin) {
    return true
  }

  // SECURITY: Reject requests with no origin metadata.
  // Server-to-server calls should use a bearer secret instead.
  // Browsers ALWAYS send Origin on cross-origin POST requests.
  if (!origin && !refererOrigin) {
    return false
  }

  // Check origin
  if (origin && allowedOrigins.has(origin)) {
    return true
  }
  
  // Check referer as fallback
  if (refererOrigin && allowedOrigins.has(refererOrigin)) {
    return true
  }
  
  return false
}

export function csrfProtection(request: NextRequest): Response | null {
  if (!validateOrigin(request)) {
    if (shouldDebugCsrf()) {
      const originHeader = request.headers.get('origin')
      const refererHeader = request.headers.get('referer')
      const requestOrigin = requestOriginFromHeaders(request)
      const allowed = Array.from(buildAllowedOrigins())
      // eslint-disable-next-line no-console
      console.warn('[csrf] Invalid origin', {
        method: request.method,
        path: request.nextUrl?.pathname,
        originHeader,
        refererHeader,
        requestOrigin,
        allowedOrigins: allowed,
      })
    }
    return new Response(
      JSON.stringify({ error: 'Invalid origin' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return null
}
