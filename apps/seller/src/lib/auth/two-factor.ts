import crypto from 'crypto'

export const TWO_FA_COOKIE = 'ng_2fa'
export const OTP_TTL_MS = 5 * 60 * 1000 // 5 dakika
export const REMEMBER_MS = 2 * 24 * 60 * 60 * 1000 // 2 gün
export const DEFAULT_MS = 2 * 60 * 60 * 1000 // 2 saat

/** Kill-switch: bozulma durumunda env'den kapatılıp erişim geri alınabilir. */
export function isTwoFactorEnabled(): boolean {
  return process.env.TWO_FACTOR_ENABLED === 'true'
}

/**
 * Mağaza incelemesi (Apple App Review / Google Play) demo hesabı için SÜRELİ muafiyet.
 * İnceleme ekibi e-postaya gelen kodu alamaz. Yalnızca:
 *  - TWO_FACTOR_EXEMPT_EMAILS (virgülle) listesindeki e-postalar ve
 *  - TWO_FACTOR_EXEMPT_UNTIL (ISO tarih) geçmemişse
 * muaf tutulur. Tarih yoksa veya geçmişse muafiyet YOKTUR (varsayılan kapalı).
 * Yalnızca gerçek veriden yalıtılmış demo mağaza hesapları buraya yazılmalı.
 */
export function isTwoFactorExempt(email: string | null | undefined): boolean {
  if (!email) return false
  const until = Date.parse(process.env.TWO_FACTOR_EXEMPT_UNTIL || '')
  if (!Number.isFinite(until) || Date.now() > until) return false
  const list = (process.env.TWO_FACTOR_EXEMPT_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const exempt = list.includes(email.toLowerCase())
  if (exempt) console.warn('[2fa] inceleme demo muafiyeti kullanıldı:', email, 'bitiş:', new Date(until).toISOString())
  return exempt
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
