import Image from 'next/image'
import { ETBIS, hasEtbis } from '@/lib/company-info'

export function EtbisBadge({ size = 88 }: { size?: number }) {
  if (!hasEtbis) return null

  return (
    <a
      href={ETBIS.verifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-col items-center gap-1 rounded-md border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label="ETBİS kaydını doğrula (Ticaret Bakanlığı)"
    >
      <Image
        src={ETBIS.qrImage}
        alt="ETBİS doğrulama karekodu"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
        unoptimized
      />
      <span className="text-[10px] font-semibold text-neutral-700">ETBİS&apos;e Kayıtlıdır</span>
    </a>
  )
}
