'use client'
import { CONSENT_OPEN_EVENT } from '@/lib/privacy/consent'
export function CookieSettingsButton() {
  return <button type="button" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>Çerez Ayarları</button>
}
