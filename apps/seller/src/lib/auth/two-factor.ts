import crypto from 'crypto'

export const TWO_FA_COOKIE = 'ng_2fa'
export const OTP_TTL_MS = 5 * 60 * 1000 // 5 dakika
export const REMEMBER_MS = 2 * 24 * 60 * 60 * 1000 // 2 gün
export const DEFAULT_MS = 2 * 60 * 60 * 1000 // 2 saat

/** Kill-switch: bozulma durumunda env'den kapatılıp erişim geri alınabilir. */
export function isTwoFactorEnabled(): boolean {
  return process.env.TWO_FACTOR_ENABLED === 'true'
}

function signingSecret(): string {
  return (
    process.env.OTP_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'novagross-dev-fallback-secret'
  )
}

export function generateCode(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

export function signToken(userId: string, expMs: number): string {
  const payload = `${userId}.${expMs}`
  const sig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyToken(token: string | undefined, userId: string): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [uid, expStr, sig] = parts
  if (uid !== userId) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  const expected = crypto.createHmac('sha256', signingSecret()).update(`${uid}.${expStr}`).digest('hex')
  try {
    if (sig.length !== expected.length) return false
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}
