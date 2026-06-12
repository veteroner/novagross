'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AgreementType } from '@/lib/agreements/registry'
import { AGREEMENT_META } from '@/lib/agreements/registry'

type Props = {
  type: AgreementType
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

// "Okudum, anladım, kabul ediyorum" checkbox + sözleşmeye yeni sekme link.
// Modal istenirse type için ek prop ile dialog açılabilir; şimdilik sayfa linki
// (yeni sekme) ile kullanıcıya tam metin gösteriliyor — yasal olarak yeterli.
export function AgreementCheckbox({ type, checked, onChange, disabled }: Props) {
  const meta = AGREEMENT_META[type]
  const id = `agr_${type}`
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
        aria-required={meta.required}
      />
      <span>
        <Link
          href={meta.path}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-700 hover:underline"
        >
          {meta.title}
        </Link>
        &apos;ni okudum, anladım ve kabul ediyorum.
        {meta.required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
    </label>
  )
}

// Birden fazla sözleşmeyi toplu yöneten hook için yardımcı tipler
export type AgreementsState = Partial<Record<AgreementType, boolean>>

export function allRequiredAccepted(
  required: AgreementType[],
  state: AgreementsState
): boolean {
  return required.every((t) => state[t] === true)
}
