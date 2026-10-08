import { TR_PROVINCES } from './tr-provinces'

const key = (s: string) =>
  (s || '').replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim()

const PROVINCE_BY_KEY = new Map(Object.keys(TR_PROVINCES).map((p) => [key(p), p]))

/**
 * Adresteki il/ilçe alanlarını düzeltir. Müşteriler bazen il alanına ilçeyi yazıyor
 * ("yenimahalle", ilçe boş) → MNG il kodu bulunamıyor ve kargo oluşmuyor.
 * - il geçerliyse olduğu gibi bırakır
 * - il alanındaki değer tek bir ilin ilçesiyse il = o il, ilçe = bu değer
 * - ilçe alanı başka bir ilin ilçesiyse ve il tanınmıyorsa ili ilçeden bulur
 * Çözülemezse orijinal değerleri döndürür (çağıran hata verir).
 */
export function normalizeTrCityDistrict(city: string, district: string): { city: string; district: string; fixed: boolean } {
  const c = PROVINCE_BY_KEY.get(key(city))
  if (c) return { city: c, district: matchDistrict(c, district) ?? district, fixed: false }

  for (const candidate of [city, district]) {
    if (!key(candidate)) continue
    const owners = Object.keys(TR_PROVINCES).filter((p) => matchDistrict(p, candidate))
    if (owners.length === 1) {
      return { city: owners[0], district: matchDistrict(owners[0], candidate)!, fixed: true }
    }
  }
  return { city, district, fixed: false }
}

function matchDistrict(province: string, name: string): string | null {
  const k = key(name)
  if (!k) return null
  return TR_PROVINCES[province]?.find((d) => key(d) === k) ?? null
}
