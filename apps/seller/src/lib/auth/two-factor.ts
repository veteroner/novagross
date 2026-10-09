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
 * İnceleme ekibi e-postaya gelen kodu alamaz. Muafiyet kullanıcı KİMLİĞİNE bağlı ve
 * bitiş tarihli: public.review_access_exemptions (two_factor = true, revoked_at yok,
 * expires_at > now). Tabloyu yalnızca service role okur; satır yoksa muafiyet YOK.
 * Süresi dolan satırları expire_review_access_exemptions() (pg_cron, saatlik) kapatır.
 */
export async function isTwoFactorExempt(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/service')
    const db: any = createServiceRoleClient()
    const { data } = await db
      .from('review_access_exemptions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('two_factor', true)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (data) console.warn('[2fa] inceleme demo muafiyeti kullanıldı:', userId, 'bitiş:', data.expires_at)
    return !!data
  } catch (e) {
    console.error('[2fa] muafiyet kontrolü başarısız — 2FA uygulanıyor', e)
    return false
  }
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
