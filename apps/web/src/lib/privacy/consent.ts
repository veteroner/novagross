export const CONSENT_VERSION = '2026-11-18'
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000
export const CONSENT_EVENT = 'cookie-consent-updated'
export const CONSENT_OPEN_EVENT = 'cookie-consent-open'
export const CONSENT_VISIBILITY_EVENT = 'cookie-consent-visibility'
export type Consent = { necessary: true; analytics: boolean; marketing: boolean; preferences: boolean }
export type ConsentRecord = Consent & { version: string; savedAt: string }
export const NECESSARY_CONSENT: Consent = { necessary: true, analytics: false, marketing: false, preferences: false }

export function parseConsent(raw: string | null, now = Date.now()): ConsentRecord | null {
  try {
    const value = JSON.parse(raw || 'null')
    const age = now - Date.parse(value?.savedAt)
    if (value?.version !== CONSENT_VERSION || !Number.isFinite(age) || age < 0 || age > CONSENT_MAX_AGE) return null
    if (value.necessary !== true || ['analytics', 'marketing', 'preferences'].some(key => typeof value[key] !== 'boolean')) return null
    return value
  } catch { return null }
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  try { return parseConsent(localStorage.getItem('cookie-consent')) } catch { return null }
}

export function isPrivateTrackingPage(path = typeof location === 'undefined' ? '' : location.pathname || '') {
  return ['/odeme', '/bulten', '/auth', '/hesabim', '/giris', '/kayit', '/sifre'].some(prefix => path.startsWith(prefix))
}

export function hasConsent(category: 'analytics' | 'marketing' | 'preferences'): boolean {
  return !isPrivateTrackingPage() && readConsent()?.[category] === true
}

export function removeTrackingStorage() {
  try {
    for (const key of ['analytics_session_id', 'current_page_view_id', '_ng_sid']) sessionStorage.removeItem(key)
    const domains = ['', location.hostname, `.${location.hostname}`, '.novagross.com']
    for (const entry of document.cookie.split(';')) {
      const name = entry.split('=')[0].trim()
      if (!/^(_ga($|_)|_gid$|_gat|_gcl_|_fbp$|_fbc$|_clck$|_clsk$)/.test(name)) continue
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ''} SameSite=Lax`
    }
  } catch { /* Storage may be disabled by the browser. */ }
}

export function saveConsent(consent: Consent): boolean {
  const previous = readConsent()
  const record: ConsentRecord = { ...consent, necessary: true, version: CONSENT_VERSION, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem('cookie-consent', JSON.stringify(record))
    localStorage.removeItem('cookie-consent-date')
    document.cookie = `ng-consent=${encodeURIComponent(JSON.stringify(record))}; Max-Age=${CONSENT_MAX_AGE / 1000}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  } catch { return false }
  if (!consent.analytics || !consent.marketing) removeTrackingStorage()
  if (!consent.preferences) { try { localStorage.removeItem('search-history') } catch {} }
  window.dispatchEvent(new Event(CONSENT_EVENT))
  // Reload stops already loaded third-party libraries, including their timers.
  if ((previous?.analytics && !consent.analytics) || (previous?.marketing && !consent.marketing)) location.reload()
  return true
}

export function requestHasAnalyticsConsent(request: { cookies: { get(name: string): { value: string } | undefined } }): boolean {
  try { return parseConsent(decodeURIComponent(request.cookies.get('ng-consent')?.value || ''))?.analytics === true } catch { return false }
}
