'use client'

import { useState, useTransition } from 'react'
import { Button } from '@novagross/ui'
import { Loader2, Save, Pencil, X } from 'lucide-react'
import { updateStoreInfo } from './actions'

type StoreInfo = {
  store_name: string | null
  company_name: string | null
  commission_rate: number | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  district: string | null
  postal_code: string | null
  bank_name: string | null
  iban: string | null
  account_holder: string | null
}

export function StoreInfoEditor({
  storeId,
  initial,
}: {
  storeId: string
  initial: StoreInfo
}) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [f, setF] = useState<StoreInfo>(initial)
  const [msg, setMsg] = useState<string | null>(null)

  const setField = (k: keyof StoreInfo, v: any) => setF((prev) => ({ ...prev, [k]: v }))

  const save = () =>
    startTransition(async () => {
      setMsg(null)
      try {
        await updateStoreInfo(storeId, f)
        setMsg('Mağaza bilgileri güncellendi.')
        setEditing(false)
      } catch (e: any) {
        setMsg(e?.message ?? 'Kayıt başarısız.')
      }
    })

  const cancel = () => {
    setF(initial)
    setEditing(false)
    setMsg(null)
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <dl className="text-sm space-y-2">
          <Row label="Mağaza adı" value={f.store_name} />
          <Row label="Şirket ünvanı" value={f.company_name} />
          <Row label="Komisyon oranı" value={`%${Number(f.commission_rate ?? 15)}`} />
          <Row label="E-posta" value={f.email} />
          <Row label="Telefon" value={f.phone} />
          <Row label="Adres" value={f.address} />
          <Row label="Konum" value={[f.district, f.city].filter(Boolean).join(', ')} />
          <Row label="Posta kodu" value={f.postal_code} />
          <Row label="Banka" value={f.bank_name} />
          <Row label="IBAN" value={f.iban} mono />
          <Row label="Hesap sahibi" value={f.account_holder} />
        </dl>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3 mr-1" /> Bilgileri düzenle
        </Button>
        {msg && <p className="text-xs text-green-700">{msg}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Mağaza adı" value={f.store_name} set={(v) => setField('store_name', v)} disabled={isPending} />
        <Field label="Komisyon oranı (%)" type="number" value={f.commission_rate ?? ''} set={(v) => setField('commission_rate', v === '' ? null : Number(v))} disabled={isPending} />
        <Field label="Şirket ünvanı" value={f.company_name} set={(v) => setField('company_name', v)} disabled={isPending} full />
        <Field label="E-posta" type="email" value={f.email} set={(v) => setField('email', v)} disabled={isPending} />
        <Field label="Telefon" value={f.phone} set={(v) => setField('phone', v)} disabled={isPending} />
        <Field label="Adres" value={f.address} set={(v) => setField('address', v)} disabled={isPending} full />
        <Field label="İlçe" value={f.district} set={(v) => setField('district', v)} disabled={isPending} />
        <Field label="İl" value={f.city} set={(v) => setField('city', v)} disabled={isPending} />
        <Field label="Posta kodu" value={f.postal_code} set={(v) => setField('postal_code', v)} disabled={isPending} />
        <Field label="Banka" value={f.bank_name} set={(v) => setField('bank_name', v)} disabled={isPending} />
        <Field label="IBAN" value={f.iban} set={(v) => setField('iban', v?.toString().toUpperCase().replace(/\s/g, ''))} disabled={isPending} mono full />
        <Field label="Hesap sahibi" value={f.account_holder} set={(v) => setField('account_holder', v)} disabled={isPending} full />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={isPending} className="bg-orange-600 text-white hover:bg-orange-700">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Kaydet
        </Button>
        <Button size="sm" variant="outline" onClick={cancel} disabled={isPending}>
          <X className="h-3 w-3 mr-1" /> İptal
        </Button>
        {msg && <span className="text-xs text-gray-600">{msg}</span>}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value || '—'}</dd>
    </div>
  )
}

function Field({
  label, value, set, type = 'text', disabled, mono, full,
}: {
  label: string; value: any; set: (v: any) => void; type?: string; disabled?: boolean; mono?: boolean; full?: boolean
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-gray-600 text-xs">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => set(e.target.value)}
        disabled={disabled}
        className={`mt-1 w-full border rounded-md px-3 py-2 text-sm ${mono ? 'font-mono' : ''}`}
      />
    </label>
  )
}
