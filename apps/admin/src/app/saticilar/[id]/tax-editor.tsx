'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, ShieldCheck, ShieldOff, Save } from 'lucide-react'
import { updateTaxInfo, verifyExemption, revokeExemption } from './actions'

const TAXPAYER_OPTIONS: { value: string; label: string }[] = [
  { value: 'real_person', label: 'Gerçek kişi' },
  { value: 'sole_proprietor', label: 'Şahıs şirketi' },
  { value: 'limited_company', label: 'Limited şirket' },
  { value: 'joint_stock_company', label: 'Anonim şirket' },
  { value: 'tradesman_exempt', label: 'Esnaf muaflığı (belge gerekli)' },
  { value: 'simple_method', label: 'Basit usul' },
  { value: 'second_hand', label: 'İkinci el motorlu taşıt ticareti' },
]

const KDV_OPTIONS = [0, 1, 8, 10, 18, 20]

export function TaxEditor({
  storeId,
  initial,
}: {
  storeId: string
  initial: {
    taxpayerType: string
    kdvRate: number
    taxNumber: string
    taxOffice: string
    isExempt: boolean
    exemptVerified: boolean
    exemptVerifiedAt: string | null
    certificateUrl: string | null
  }
}) {
  const [isPending, startTransition] = useTransition()
  const [taxpayerType, setTaxpayerType] = useState(initial.taxpayerType)
  const [kdvRate, setKdvRate] = useState(initial.kdvRate)
  const [taxNumber, setTaxNumber] = useState(initial.taxNumber)
  const [taxOffice, setTaxOffice] = useState(initial.taxOffice)
  const [message, setMessage] = useState<string | null>(null)

  const run = (fn: () => Promise<void>, ok: string) =>
    startTransition(async () => {
      setMessage(null)
      try {
        await fn()
        setMessage(ok)
      } catch (e: any) {
        setMessage(e?.message ?? 'İşlem başarısız.')
      }
    })

  const save = () =>
    run(
      () => updateTaxInfo(storeId, { taxpayerType, kdvRate, taxNumber, taxOffice }),
      'Vergi bilgileri kaydedildi.'
    )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-600">Mükellef türü</span>
          <select
            value={taxpayerType}
            onChange={(e) => setTaxpayerType(e.target.value)}
            disabled={isPending}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
          >
            {TAXPAYER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-gray-600">KDV oranı (%)</span>
          <select
            value={kdvRate}
            onChange={(e) => setKdvRate(Number(e.target.value))}
            disabled={isPending}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
          >
            {KDV_OPTIONS.map((r) => (
              <option key={r} value={r}>
                %{r}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-gray-600">VKN / TCKN</span>
          <input
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="10 hane VKN / 11 hane TCKN"
            disabled={isPending}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-600">Vergi dairesi</span>
          <input
            value={taxOffice}
            onChange={(e) => setTaxOffice(e.target.value)}
            placeholder="ör. Çankaya VD"
            disabled={isPending}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={isPending} className="bg-orange-600 text-white hover:bg-orange-700">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Kaydet
        </Button>
        {message && <span className="text-xs text-gray-600">{message}</span>}
      </div>

      <hr />

      {/* Esnaf muafiyeti onay akışı */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Esnaf muafiyeti (stopaj istisnası)</p>
        <p className="text-xs text-gray-500">
          GVK 9. madde kapsamındaki esnaf muaflığı belgesi olan satıcılardan %1 stopaj kesilmez.
          Onay <strong>yalnızca belge doğrulandıktan sonra</strong> verilmelidir — onaylanana kadar kesinti devam eder.
        </p>

        {initial.certificateUrl ? (
          <a
            href={initial.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 hover:underline"
          >
            📄 Yüklenen muafiyet belgesini görüntüle
          </a>
        ) : (
          <p className="text-sm text-gray-400">Satıcı henüz muafiyet belgesi yüklemedi.</p>
        )}

        <div className="flex items-center gap-2">
          {initial.exemptVerified ? (
            <>
              <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Muafiyet onaylı
                {initial.exemptVerifiedAt && (
                  <span className="text-xs text-gray-500 font-normal">
                    ({new Date(initial.exemptVerifiedAt).toLocaleDateString('tr-TR')})
                  </span>
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  if (confirm('Muafiyet onayını kaldırmak istediğinize emin misiniz? Sonraki siparişlerden %1 stopaj kesilmeye başlanır.')) {
                    run(() => revokeExemption(storeId), 'Muafiyet onayı kaldırıldı.')
                  }
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <ShieldOff className="h-3 w-3 mr-1" />
                Onayı kaldır
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={isPending || !initial.certificateUrl}
              onClick={() => {
                if (confirm('Belgeyi incelediniz mi? Onaylandığında bu satıcıdan stopaj kesilmeyecek.')) {
                  run(() => verifyExemption(storeId), 'Muafiyet onaylandı — stopaj kesilmeyecek.')
                }
              }}
              className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Belgeyi doğruladım, muafiyeti onayla
            </Button>
          )}
        </div>

        {initial.isExempt && !initial.exemptVerified && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ Satıcı muafiyet talep etti ama henüz onaylanmadı. Onaylanana kadar %1 stopaj kesilmeye devam eder.
          </p>
        )}
      </div>
    </div>
  )
}
