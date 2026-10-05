'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, Eye, Send } from 'lucide-react'
import {
  previewIyzicoSubMerchant,
  registerIyzicoSubMerchant,
  type IyzicoSubMerchantPreview,
} from './iyzico-actions'

const FIELD_LABELS: Record<string, string> = {
  subMerchantType: 'Tip',
  name: 'Mağaza adı',
  legalCompanyTitle: 'Yasal ünvan (banka hesap sahibi)',
  taxOffice: 'Vergi dairesi',
  taxNumber: 'VKN',
  iban: 'IBAN',
  email: 'E-posta',
  gsmNumber: 'Telefon',
  address: 'Adres',
  subMerchantExternalId: 'Dış no',
}

export function IyzicoSubMerchant({ storeId, currentKey }: { storeId: string; currentKey: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<IyzicoSubMerchantPreview | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadPreview = () =>
    startTransition(async () => {
      setMessage(null)
      try {
        setPreview(await previewIyzicoSubMerchant(storeId))
      } catch (e: any) {
        setMessage(e?.message ?? 'Önizleme alınamadı.')
      }
    })

  const register = () => {
    const warning = currentKey
      ? 'Mağazanın mevcut iyzico kaydı yerine YENİ bir şirket kaydı açılacak ve sonraki siparişlerin parası bu kayda gidecek. Devam edilsin mi?'
      : 'Mağaza iyzico\'ya şirket olarak kaydedilecek. Devam edilsin mi?'
    if (!confirm(warning)) return
    startTransition(async () => {
      setMessage(null)
      try {
        const res = await registerIyzicoSubMerchant(storeId)
        setMessage(`Kayıt açıldı. Yeni anahtar: ${res.subMerchantKey}${res.previousKey ? ` (eski: ${res.previousKey})` : ''}`)
        setPreview(null)
      } catch (e: any) {
        setMessage(e?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Mevcut alt üye işyeri anahtarı:{' '}
        <span className="font-mono text-xs">{currentKey ?? 'yok'}</span>
      </p>
      <p className="text-xs text-gray-500">
        Para gönderimi IBAN sahibinin adıyla yapılır; ünvan bankadaki hesap sahibi adıyla birebir aynı olmalı,
        aksi halde banka ödemeyi reddeder.
      </p>

      {preview && (
        <div className="rounded border bg-gray-50 p-3 text-xs space-y-1">
          {preview.errors.length > 0 && (
            <ul className="text-red-700 list-disc pl-4">
              {preview.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {preview.request &&
            Object.entries(FIELD_LABELS).map(([k, label]) => (
              <div key={k} className="flex gap-2">
                <span className="text-gray-500 w-48 shrink-0">{label}</span>
                <span className="font-mono break-all">{preview.request?.[k]}</span>
              </div>
            ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={loadPreview} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
          Gönderilecek bilgileri göster
        </Button>
        <Button
          size="sm"
          onClick={register}
          disabled={isPending || !preview?.ok}
          className="bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          <Send className="h-3 w-3 mr-1" />
          iyzico&apos;ya şirket olarak kaydet
        </Button>
      </div>
      {message && <p className="text-xs text-gray-700 break-all">{message}</p>}
    </div>
  )
}
