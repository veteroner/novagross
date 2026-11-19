'use client'
import { useEffect, useState } from 'react'
import { readConsent, CONSENT_VISIBILITY_EVENT, CONSENT_EVENT } from './consent'
let activePrompt: string | null = null
const SLOT_EVENT = 'novagross-prompt-slot'
export function usePrivacyOverlay() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setVisible(!readConsent())
    const update = (event: Event) => setVisible(Boolean((event as CustomEvent).detail))
    const saved = () => setVisible(!readConsent())
    window.addEventListener(CONSENT_VISIBILITY_EVENT, update)
    window.addEventListener(CONSENT_EVENT, saved)
    return () => { window.removeEventListener(CONSENT_VISIBILITY_EVENT, update); window.removeEventListener(CONSENT_EVENT, saved) }
  }, [])
  return visible
}
export function usePromptSlot(name: string, wanted: boolean) {
  const privacyOpen = usePrivacyOverlay()
  const [, render] = useState(0)
  useEffect(() => {
    const update = () => render(value => value + 1)
    window.addEventListener(SLOT_EVENT, update)
    return () => window.removeEventListener(SLOT_EVENT, update)
  }, [])
  useEffect(() => {
    if (wanted && !privacyOpen && !activePrompt) { activePrompt = name; window.dispatchEvent(new Event(SLOT_EVENT)) }
    if ((!wanted || privacyOpen) && activePrompt === name) { activePrompt = null; window.dispatchEvent(new Event(SLOT_EVENT)) }
  })
  useEffect(() => () => { if (activePrompt === name) { activePrompt = null; window.dispatchEvent(new Event(SLOT_EVENT)) } }, [name])
  return !privacyOpen && activePrompt === name && wanted
}
