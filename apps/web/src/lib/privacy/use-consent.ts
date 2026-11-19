'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, hasConsent, isPrivateTrackingPage } from './consent'

export function useConsent(category: 'analytics' | 'marketing' | 'preferences') {
  const pathname = usePathname()
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const update = () => setAllowed(hasConsent(category))
    if (isPrivateTrackingPage(pathname) && document.querySelector('script[src*="googletagmanager.com"],script[src*="clarity.ms"],script[src*="connect.facebook.net"]')) { location.reload(); return }
    update()
    window.addEventListener(CONSENT_EVENT, update)
    window.addEventListener('storage', update)
    return () => { window.removeEventListener(CONSENT_EVENT, update); window.removeEventListener('storage', update) }
  }, [category, pathname])
  return allowed
}
