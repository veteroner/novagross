import { createHmac, timingSafeEqual } from 'node:crypto'
function signature(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('İşlem doğrulama yapılandırması eksik')
  return createHmac('sha256', key).update(value).digest('base64url')
}
export function signToken(purpose: string, data: unknown, expiresInSeconds = 86400) {
  const body = Buffer.from(JSON.stringify({ purpose, data, expiresAt: Date.now() + expiresInSeconds * 1000 })).toString('base64url')
  return `${body}.${signature(body)}`
}
export function verifyToken<T>(token: unknown, purpose: string): T | null {
  try {
    if (typeof token !== 'string' || token.length > 30000) return null
    const [body, sig, extra] = token.split('.')
    if (!body || !sig || extra) return null
    const expected = Buffer.from(signature(body)), actual = Buffer.from(sig)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString())
    return decoded.purpose === purpose && Number.isFinite(decoded.expiresAt) && decoded.expiresAt > Date.now() ? decoded.data as T : null
  } catch { return null }
}
