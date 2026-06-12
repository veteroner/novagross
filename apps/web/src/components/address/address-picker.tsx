'use client'

import { useState, useMemo, useTransition } from 'react'
import { MapPin, Navigation, Loader2, X } from 'lucide-react'
import { PROVINCES, findDistricts } from '@/lib/turkey-locations'

export type AddressValue = {
  city: string         // İl
  district: string     // İlçe
  neighborhood: string // Mahalle (opsiyonel, manuel)
  address: string      // Cadde/Sokak + kapı no + serbest
  building_no: string
  floor: string
  apartment_no: string
  description: string
  postal_code: string
  latitude?: number | null
  longitude?: number | null
}

export const EMPTY_ADDRESS: AddressValue = {
  city: '', district: '', neighborhood: '', address: '',
  building_no: '', floor: '', apartment_no: '',
  description: '', postal_code: '',
  latitude: null, longitude: null,
}

type Props = {
  value: AddressValue
  onChange: (v: AddressValue) => void
  disabled?: boolean
}

// İl/ilçe listeden seçim + (opsiyonel) konum izniyle otomatik doldurma.
// Konum onayı: tarayıcı Geolocation API → BigDataCloud free reverse geocode
// (API key gerekmez, CORS güvenli). Kullanıcı her ihtimalde manuel düzenleyebilir.
export function AddressPicker({ value, onChange, disabled }: Props) {
  const [geoLoading, startGeoTransition] = useTransition()
  const [geoError, setGeoError] = useState<string | null>(null)
  const districts = useMemo(() => findDistricts(value.city), [value.city])

  const set = (k: keyof AddressValue, v: any) => onChange({ ...value, [k]: v })

  const useMyLocation = () => {
    setGeoError(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Tarayıcınız konum servisini desteklemiyor.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        startGeoTransition(async () => {
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=tr`,
              { cache: 'no-store' }
            )
            if (!res.ok) throw new Error('reverse geocode hata')
            const j = await res.json()
            // BigDataCloud TR field eşleştirmesi
            const city = String(j.principalSubdivision || '').trim()
            // ilçe = locality veya city, district name
            const district = String(j.locality || j.city || '').trim()
            const neighborhood = String(
              j.localityInfo?.administrative?.find?.((a: any) => a.adminLevel === 6)?.name || ''
            ).trim()
            const street = [j.localityInfo?.administrative?.find?.((a: any) => a.adminLevel === 8)?.name, ''].filter(Boolean).join(' ').trim()
            onChange({
              ...value,
              city,
              district,
              neighborhood,
              address: street || value.address,
              postal_code: String(j.postcode || j.localityInfo?.postcode || value.postal_code || ''),
              latitude,
              longitude,
            })
          } catch (e: any) {
            setGeoError('Konumdan adres alınamadı, lütfen elle seçin.')
          }
        })
      },
      (err) => {
        if (err.code === 1) setGeoError('Konum izni reddedildi. Tarayıcı ayarlarından izin verebilirsiniz.')
        else setGeoError('Konum alınamadı.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <div className="space-y-3 text-sm">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={disabled || geoLoading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 disabled:opacity-50"
      >
        {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        Konumumu kullan (il/ilçe/mahalle otomatik dolsun)
      </button>
      {geoError && <p className="text-xs text-red-600">{geoError}</p>}
      {value.latitude != null && value.longitude != null && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Konum kaydedildi: {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-gray-600 text-xs">İl <span className="text-red-500">*</span></span>
          <select
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value, district: '' })}
            disabled={disabled}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
            required
          >
            <option value="">İl seçin…</option>
            {PROVINCES.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-gray-600 text-xs">İlçe <span className="text-red-500">*</span></span>
          <select
            value={value.district}
            onChange={(e) => set('district', e.target.value)}
            disabled={disabled || !value.city}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
            required
          >
            <option value="">{value.city ? 'İlçe seçin…' : 'Önce il seçin'}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-gray-600 text-xs">Mahalle</span>
          <input
            value={value.neighborhood}
            onChange={(e) => set('neighborhood', e.target.value)}
            disabled={disabled}
            placeholder="Konumdan otomatik dolar veya elle yazın"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-gray-600 text-xs">Cadde / Sokak <span className="text-red-500">*</span></span>
          <input
            value={value.address}
            onChange={(e) => set('address', e.target.value)}
            disabled={disabled}
            placeholder="Atatürk Cad. / Cumhuriyet Sk. vb."
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block">
          <span className="text-gray-600 text-xs">Bina No <span className="text-red-500">*</span></span>
          <input
            value={value.building_no}
            onChange={(e) => set('building_no', e.target.value)}
            disabled={disabled}
            placeholder="12 / 12A"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block">
          <span className="text-gray-600 text-xs">Kat</span>
          <input
            value={value.floor}
            onChange={(e) => set('floor', e.target.value)}
            disabled={disabled}
            placeholder="3"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-gray-600 text-xs">Daire No</span>
          <input
            value={value.apartment_no}
            onChange={(e) => set('apartment_no', e.target.value)}
            disabled={disabled}
            placeholder="7"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-gray-600 text-xs">Posta kodu</span>
          <input
            value={value.postal_code}
            onChange={(e) => set('postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
            disabled={disabled}
            placeholder="06946"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-gray-600 text-xs">Adres tarifi (kuryeye yardımcı)</span>
          <input
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
            disabled={disabled}
            placeholder="Örn: Migros'un yanı, mavi binanın 2. katı"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  )
}

// Tek satırlık özet — fişlerde/dropdown'da kullan
export function formatAddress(v: AddressValue): string {
  const parts = [
    v.address,
    v.building_no ? `No: ${v.building_no}` : '',
    v.floor ? `K: ${v.floor}` : '',
    v.apartment_no ? `D: ${v.apartment_no}` : '',
    v.neighborhood,
    v.district,
    v.city,
    v.postal_code,
  ].filter(Boolean)
  return parts.join(' · ')
}
