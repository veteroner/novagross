const FALLBACK_SITE_URL = 'https://novagross.com'

export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (!raw) return FALLBACK_SITE_URL

  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('//')) return `https:${raw}`

  // If env is set as "novagross.com" (no scheme), normalize to https.
  return `https://${raw}`
}

export function getSiteUrlObject(): URL {
  try {
    return new URL(getSiteUrl())
  } catch {
    return new URL(FALLBACK_SITE_URL)
  }
}
