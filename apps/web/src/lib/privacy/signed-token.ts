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

// An encrypted, short-lived handoff keeps existing mobile clients compatible without
// putting their access token or checkout address in a readable URL.
export function encryptCheckoutHandoff(data: { accessToken: string; checkout: Record<string, unknown> }) {
  const { createCipheriv, randomBytes, createHash } = require('node:crypto') as typeof import('node:crypto')
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Ödeme oturumu yapılandırması eksik')
  const key = createHash('sha256').update(`mobile-checkout-v1:${secret}`).digest()
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('novagross-mobile-checkout-v1'))
  const body = Buffer.from(JSON.stringify({ ...data, expiresAt: Date.now() + 20 * 60 * 1000 }))
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}
export function decryptCheckoutHandoff(ticket: unknown): { accessToken: string; checkout: Record<string, unknown> } | null {
  try {
    if (typeof ticket !== 'string' || ticket.length > 30000) return null
    const { createDecipheriv, createHash } = require('node:crypto') as typeof import('node:crypto')
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return null
    const value = Buffer.from(ticket, 'base64url')
    if (value.length < 29) return null
    const key = createHash('sha256').update(`mobile-checkout-v1:${secret}`).digest()
    const decipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12))
    decipher.setAAD(Buffer.from('novagross-mobile-checkout-v1')); decipher.setAuthTag(value.subarray(12, 28))
    const data = JSON.parse(Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString())
    return typeof data.accessToken === 'string' && data.checkout && typeof data.checkout === 'object' && data.expiresAt > Date.now() ? data : null
  } catch { return null }
}
