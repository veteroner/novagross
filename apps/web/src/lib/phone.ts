// Veritabanı tetikleyicisi (validate_phone) yalnız ^(\+90|0)?[0-9]{10}$ kabul eder;
// boşluk, tire, parantez reddedilir. Formlar "0532 123 45 67" gibi girişleri bu
// fonksiyonla tek biçime (05321234567) çevirir.

export const PHONE_PLACEHOLDER = '05XX XXX XX XX'

/** Türkiye numarasını 0XXXXXXXXXX biçimine çevirir; geçersizse null. */
export function normalizePhone(input: string | null | undefined): string | null {
  let d = String(input ?? '').replace(/[\s\-().]/g, '')
  if (d.startsWith('+90')) d = d.slice(3)
  else if (d.startsWith('0090')) d = d.slice(4)
  else if (d.length === 12 && d.startsWith('90')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (!/^[1-9][0-9]{9}$/.test(d)) return null
  return `0${d}`
}

export const PHONE_ERROR = 'Telefon numarası geçersiz. Örnek: 0532 123 45 67'
