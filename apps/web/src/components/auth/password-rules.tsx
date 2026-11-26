'use client'

import { Check, X } from 'lucide-react'
import { PASSWORD_RULES } from '@/lib/password-policy'

/** Şifre alanının altında kuralların karşılanıp karşılanmadığını canlı gösterir. */
export function PasswordRules({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="mt-2 grid gap-1 text-xs" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${ok ? 'text-green-700' : 'text-gray-500'}`}>
            {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? 'karşılandı' : 'karşılanmadı'}</span>
          </li>
        )
      })}
    </ul>
  )
}
