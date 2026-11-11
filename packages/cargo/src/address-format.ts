/**
 * Yapılandırılmış adres ↔ addresses satırı / sipariş snapshot'ı dönüşümleri.
 *
 * Tek doğruluk kaynağı `addresses.metadata` (mahalle, cadde/sokak, bina no, kat,
 * daire, tarif, koordinat). `address_line1/2` her zaman bu alanlardan AYNI formatta
 * üretilir; böylece kargo/etiket/e-posta tek satırlık tam adresi okuyabilir.
 *
 * Eski kayıtlarda metadata yoksa (veya eksikse) line1/line2 metninden en iyi tahminle
 * alanlar geri çıkarılır.
 */

export type StructuredAddress = {
  neighborhood: string // Mahalle
  street: string // Cadde / Sokak (+ site adı vb.)
  building_no: string
  floor: string
  apartment_no: string
  description: string // Adres tarifi
  postal_code?: string
  latitude?: number | null
  longitude?: number | null
}

export type AddressLike = {
  address_line1?: string | null
  address_line2?: string | null
  // Json kolonu: nesne değilse yok sayılır
  metadata?: unknown
  // Sipariş snapshot'ında da bulunabilen alanlar
  neighborhood?: string | null
  street?: string | null
  building_no?: string | null
  floor?: string | null
  apartment_no?: string | null
  description?: string | null
  full_address?: string | null
  district?: string | null
  city?: string | null
  postal_code?: string | null
}

const clean = (v: unknown): string =>
  v == null ? '' : String(v).replace(/\s+/g, ' ').trim()

/** "Kızılay Mah." / "Kızılay Mahallesi" → "Kızılay" */
function stripMahSuffix(v: string): string {
  return clean(v).replace(/\s*\b(mah\.?|mahallesi|mahalle)$/i, '').trim()
}

/** Yapılandırılmış adresten address_line1 / address_line2 üretir. */
export function composeAddressLines(a: Partial<StructuredAddress>): {
  address_line1: string
  address_line2: string
} {
  const neighborhood = stripMahSuffix(a.neighborhood ?? '')
  const line1 = [
    neighborhood ? `${neighborhood} Mah.` : '',
    clean(a.street),
    clean(a.building_no) ? `No: ${clean(a.building_no)}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  const line2 = [
    clean(a.floor) ? `Kat: ${clean(a.floor)}` : '',
    clean(a.apartment_no) ? `Daire: ${clean(a.apartment_no)}` : '',
    clean(a.description),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  return { address_line1: line1, address_line2: line2 }
}

/** addresses.metadata olarak saklanacak nesne. */
export function toAddressMetadata(a: Partial<StructuredAddress>): Record<string, any> {
  return {
    neighborhood: stripMahSuffix(a.neighborhood ?? '') || null,
    street: clean(a.street) || null,
    building_no: clean(a.building_no) || null,
    floor: clean(a.floor) || null,
    apartment_no: clean(a.apartment_no) || null,
    description: clean(a.description) || null,
    latitude: typeof a.latitude === 'number' ? a.latitude : null,
    longitude: typeof a.longitude === 'number' ? a.longitude : null,
    format_version: 2,
  }
}

// Bir sonraki "etiket:" tokenına (No/Kat/K/Daire/D) ya da sona kadar
const NEXT_TOKEN = String.raw`(?=\s+(?:No|Kat|K|Daire|D)\s*:|$)`

function takeToken(s: string, re: RegExp): [string, string] {
  const m = s.match(re)
  if (!m) return ['', s]
  return [clean(m[1]), clean(s.replace(m[0], ' '))]
}

/**
 * Serbest metinli line1/line2'den alanları tahmin eder. Desteklenen eski formatlar:
 *   Adreslerim : "<Mah> Mah. <cadde> No: <bina>"  +  "Kat: <k> Daire: <d> <tarif>"
 *   Ödeme      : "<cadde> No: <bina> K: <k> D: <d> <Mah> Mah."  +  "<tarif>"
 *   Mobil      : serbest metin → tamamı cadde/sokak
 */
export function parseAddressLines(
  line1: string | null | undefined,
  line2: string | null | undefined
): StructuredAddress {
  let s = clean(line1)
  let neighborhood = ''

  const mah = s.match(/\s+Mah(?:\.|allesi)?(?=\s|$)/i)
  if (mah && mah.index !== undefined && mah.index > 0) {
    const before = clean(s.slice(0, mah.index))
    const after = clean(s.slice(mah.index + mah[0].length))
    if (after) {
      // Adreslerim formatı: "<Mah> Mah. <cadde> No: …"
      neighborhood = before
      s = after
    } else {
      // Ödeme formatı: "… <Mah> Mah." — mahalle adı son kelime(ler); tokenlardan
      // (No:/K:/D:) sonra kalan kısmı mahalle say, yoksa son kelime.
      const afterTokens = before.match(/.*\b(?:No|Kat|K|Daire|D)\s*:\s*\S+\s+(.+)$/i)
      if (afterTokens) {
        neighborhood = clean(afterTokens[1])
        s = clean(before.slice(0, before.length - afterTokens[1].length))
      } else {
        const lastWord = before.match(/(\S+)$/)
        neighborhood = lastWord ? lastWord[1] : ''
        s = clean(before.slice(0, before.length - neighborhood.length))
      }
    }
  }

  let floor = ''
  let apartment = ''
  let building = ''
  ;[floor, s] = takeToken(s, new RegExp(String.raw`\b(?:Kat|K)\s*:\s*(.+?)${NEXT_TOKEN}`, 'i'))
  ;[apartment, s] = takeToken(s, new RegExp(String.raw`\b(?:Daire|D)\s*:\s*(.+?)${NEXT_TOKEN}`, 'i'))
  ;[building, s] = takeToken(s, new RegExp(String.raw`\bNo\s*:\s*(.+?)${NEXT_TOKEN}`, 'i'))

  let d = clean(line2)
  let f2 = ''
  let a2 = ''
  ;[f2, d] = takeToken(d, /\bKat\s*:\s*(\S+)/i)
  ;[a2, d] = takeToken(d, /\bDaire\s*:\s*(\S+)/i)

  return {
    neighborhood,
    street: s,
    building_no: building,
    floor: floor || f2,
    apartment_no: apartment || a2,
    description: d,
  }
}

/** Satır/snapshot → yapılandırılmış adres (önce metadata/alanlar, eksikler metinden). */
export function fromAddressRow(row: AddressLike | null | undefined): StructuredAddress {
  if (!row) {
    return { neighborhood: '', street: '', building_no: '', floor: '', apartment_no: '', description: '' }
  }
  const m = (
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}
  ) as Record<string, any>
  const parsed = parseAddressLines(row.address_line1, row.address_line2)
  const pick = (...vals: unknown[]) => {
    for (const v of vals) {
      const c = clean(v)
      if (c) return c
    }
    return ''
  }

  // metadata.street yalnızca format_version>=2 kayıtlarda var. Eski ödeme kayıtlarında
  // metadata'da diğer alanlar olsa da line1'in tamamı birleşik metin → parse'tan al.
  return {
    neighborhood: stripMahSuffix(pick(m.neighborhood, row.neighborhood, parsed.neighborhood)),
    street: pick(m.street, row.street, parsed.street),
    building_no: pick(m.building_no, row.building_no, parsed.building_no),
    floor: pick(m.floor, row.floor, parsed.floor),
    apartment_no: pick(m.apartment_no, row.apartment_no, parsed.apartment_no),
    description: pick(m.description, row.description, parsed.description),
    postal_code: clean(row.postal_code) || undefined,
    latitude: typeof m.latitude === 'number' ? m.latitude : null,
    longitude: typeof m.longitude === 'number' ? m.longitude : null,
  }
}

/**
 * Kargo/etiket/e-posta için tek satırlık tam açık adres (il/ilçe hariç — onlar
 * kargo API'lerine ayrı alan olarak gider). Örn:
 *   "Turgut Özal Mah. 2609 sokak Atakent 2 Sitesi No: C blok Kat: 11 Daire: 45"
 */
export function fullAddressLine(row: AddressLike | null | undefined): string {
  if (!row) return ''
  if (clean(row.full_address)) return clean(row.full_address)
  const s = fromAddressRow(row)
  const { address_line1, address_line2 } = composeAddressLines(s)
  const composed = [address_line1, address_line2].filter(Boolean).join(' ')
  // Güvenlik ağı: compose hiçbir şey üretemediyse ham satırları kullan
  return composed || [clean(row.address_line1), clean(row.address_line2)].filter(Boolean).join(' ')
}

/** İl/ilçe dahil insan-okur tam adres (e-posta, etiket). */
export function fullAddressWithCity(row: AddressLike | null | undefined): string {
  if (!row) return ''
  const cityPart = [clean(row.district), clean(row.city)].filter(Boolean).join(' / ')
  return [fullAddressLine(row), cityPart, clean(row.postal_code)].filter(Boolean).join(', ')
}
