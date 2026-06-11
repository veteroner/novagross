'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, Save, Upload, ShieldCheck, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateSellerTaxInfo, saveCertificatePath } from './actions'

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

export function TaxSettings({
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
    certificateSignedUrl: string | null
    hasCertificate: boolean
  }
}) {
  const [isPending, startTransition] = useTransition()
  const [taxpayerType, setTaxpayerType] = useState(initial.taxpayerType)
  const [kdvRate, setKdvRate] = useState(initial.kdvRate)
  const [taxNumber, setTaxNumber] = useState(initial.taxNumber)
  const [taxOffice, setTaxOffice] = useState(initial.taxOffice)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const save = () =>
    startTransition(async () => {
      setMessage(null)
      try {
        await updateSellerTaxInfo({ taxpayerType, kdvRate, taxNumber, taxOffice })
        setMessage('Vergi bilgileri kaydedildi.')
      } catch (e: any) {
        setMessage(e?.message ?? 'Kaydetme başarısız.')
      }
    })

  const uploadCertificate = () => {
    if (!file) {
      setMessage('Lütfen bir dosya seçin.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Dosya 10 MB üstünde olamaz.')
      return
    }
    // SECURITY: MIME + extension whitelist — sadece güvenli belge tipleri
    const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
      setMessage('Sadece PDF, JPG, PNG, WebP dosyaları kabul edilir.')
      return
    }

    startTransition(async () => {
      setMessage(null)
      try {
        const supabase = createClient()
        const path = `${storeId}/muafiyet_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (uploadErr) throw uploadErr

        await saveCertificatePath(path)
        setFile(null)
        setMessage('Belge yüklendi — admin onayı bekleniyor.')
      } catch (e: any) {
        setMessage(e?.message ?? 'Yükleme başarısız.')
      }
    })
  }

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
        <Button
          size="sm"
          onClick={save}
          disabled={isPending}
          style={{ backgroundColor: '#16A34A' }}
          className="text-white"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Kaydet
        </Button>
        {message && <span className="text-xs text-gray-600">{message}</span>}
      </div>

      {/* Esnaf muafiyeti belgesi */}
      {(taxpayerType === 'tradesman_exempt' || initial.isExempt || initial.hasCertificate) && (
        <>
          <hr />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Esnaf Vergi Muafiyeti Belgesi</p>

            {initial.exemptVerified ? (
              <p className="inline-flex items-center gap-1 text-sm text-green-700">
                <ShieldCheck className="h-4 w-4" />
                Muafiyetiniz onaylı — satışlarınızdan stopaj kesilmiyor.
              </p>
            ) : initial.hasCertificate ? (
              <p className="inline-flex items-center gap-1 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                Belgeniz yüklendi, admin onayı bekleniyor. Onaylanana kadar %1 stopaj kesilmeye devam eder.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                GVK 9. madde kapsamında esnaf muaflığınız varsa belgenizi yükleyin.
                Admin onayından sonra satışlarınızdan stopaj kesilmez.
              </p>
            )}

            {initial.certificateSignedUrl && (
              <a
                href={initial.certificateSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-700 hover:underline"
              >
                📄 Mevcut belgeyi görüntüle
              </a>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={isPending}
                className="text-sm border rounded-md px-3 py-1.5 bg-white"
              />
              <Button
                size="sm"
                onClick={uploadCertificate}
                disabled={isPending || !file}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                Belgeyi yükle
              </Button>
            </div>
            <p className="text-xs text-gray-400">PDF, JPG, PNG veya WebP — en fazla 10 MB.</p>
          </div>
        </>
      )}
    </div>
  )
}
