'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

interface KVKKConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  variant?: 'newsletter' | 'contact' | 'seller'
}

type KVKKVariant = NonNullable<KVKKConsentProps['variant']>

const LINK_CLASS = 'underline underline-offset-2 text-current hover:opacity-80'

const KVKK_TEXTS: Record<KVKKVariant, { text: ReactNode }> = {
  newsletter: {
    text: (
      <>
        <Link href="/kvkk" className={LINK_CLASS} target="_blank">
          KVKK Aydınlatma Metni
        </Link>
        &apos;ni okudum, anladım. E-posta adresimin kampanya, yenilik ve duyurular için kullanılmasını kabul ediyorum.
        <Link href="/cerez-politikasi" className={LINK_CLASS + ' ml-1'} target="_blank">
          Çerez Politikası
        </Link>
        &apos;nı da okudum.
      </>
    ),
  },
  contact: {
    text: (
      <>
        <Link href="/kvkk" className={LINK_CLASS} target="_blank">
          KVKK Aydınlatma Metni
        </Link>
        &apos;ni okudum, anladım. Tarafıma dönüş yapılabilmesi için iletişim bilgilerimin kullanılmasını kabul ediyorum.
      </>
    ),
  },
  seller: {
    text: (
      <>
        <Link href="/kvkk" className={LINK_CLASS} target="_blank">
          KVKK Aydınlatma Metni
        </Link>
        &apos;ni okudum, anladım. Başvuru sürecinin yürütülmesi için kişisel verilerimin işlenmesini kabul ediyorum.
        <Link href="/gizlilik-politikasi" className={LINK_CLASS + ' ml-1'} target="_blank">
          Gizlilik Politikası
        </Link>
        &apos;nı da okudum.
      </>
    ),
  },
}

export function KVKKConsent({ checked, onChange, required, variant = 'contact' }: KVKKConsentProps) {
  const [showInfo, setShowInfo] = useState(false)
  const checkboxId = `kvkk-consent-${variant}`
  const content = KVKK_TEXTS[variant]
  const isNewsletter = variant === 'newsletter'
  const wrapperTextClass = isNewsletter ? 'text-white' : ''
  const labelTextClass = isNewsletter ? 'text-current' : 'text-foreground'
  const iconTextClass = isNewsletter ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'
  const infoWrapperTextClass = isNewsletter ? 'text-white' : 'text-foreground'
  const infoMutedTextClass = isNewsletter ? 'text-white/80' : 'text-muted-foreground'

  return (
    <div className={`space-y-2 ${wrapperTextClass}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          className="mt-1 h-4 w-4 rounded border-border bg-background text-foreground"
        />
        <label htmlFor={checkboxId} className={`flex-1 text-sm leading-relaxed ${labelTextClass}`}>
          {content.text}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>

        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className={`${iconTextClass} transition-colors`}
          aria-label="KVKK bilgisi"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showInfo ? (
        <div className={`ml-7 rounded-md border border-border bg-muted/40 p-3 text-xs ${infoWrapperTextClass}`}>
          <p className="font-semibold mb-2">Kişisel Verilerinizin Korunması</p>
          <ul className={`space-y-1 list-disc list-inside ${infoMutedTextClass}`}>
            <li>Verileriniz 6698 sayılı KVKK kapsamında korunur</li>
            <li>Verileriniz sadece belirtilen amaçlar için kullanılır</li>
            <li>İstediğiniz zaman verilerinizin silinmesini talep edebilirsiniz</li>
          </ul>
          <p className={`mt-2 ${infoMutedTextClass}`}>
            Detaylı bilgi:{' '}
            <Link href="/kvkk" className={LINK_CLASS} target="_blank">
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  )
}
