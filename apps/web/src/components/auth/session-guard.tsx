'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const REMEMBER_MS = 2 * 24 * 60 * 60 * 1000 // beni hatırla: 2 gün
const DEFAULT_MS = 2 * 60 * 60 * 1000 // varsayılan: 2 saat
const ACT_KEY = '_ng_last_activity'
const REM_KEY = '_ng_remember'
const LOGIN_PATH = '/giris'

/**
 * Idle (hareketsizlik) bazlı oturum koruması.
 * Beni hatırla işaretliyse 2 gün, değilse 2 saat hareketsizlik sonrası otomatik çıkış.
 * Her kullanıcı etkileşimi sayaç sıfırlar (sekmeler arası localStorage paylaşımlı).
 */
export function SessionGuard() {
  useEffect(() => {
    const supabase = createClient()

    const touch = () => {
      try {
        localStorage.setItem(ACT_KEY, String(Date.now()))
      } catch {}
    }
    if (!localStorage.getItem(ACT_KEY)) touch()

    let lastTouch = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastTouch > 10000) {
        lastTouch = now
        touch()
      }
    }
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const remember = localStorage.getItem(REM_KEY) === '1'
      const windowMs = remember ? REMEMBER_MS : DEFAULT_MS
      const last = Number(localStorage.getItem(ACT_KEY) || Date.now())
      if (Date.now() - last > windowMs) {
        await supabase.auth.signOut()
        try {
          localStorage.removeItem(ACT_KEY)
        } catch {}
        window.location.href = `${LOGIN_PATH}?reason=timeout`
      }
    }

    const iv = setInterval(check, 60000)
    void check()

    return () => {
      clearInterval(iv)
      events.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [])

  return null
}
