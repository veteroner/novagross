// apps/web/src/lib/password-policy.ts ile aynı tutulmalı (Supabase Auth şifre kuralı).
// Supabase Auth (üretim) şifre kuralı: en az 12 karakter ve küçük harf, büyük harf,
// rakam ve sembol içermeli. İstemci ve sunucu aynı kuralı bu dosyadan uygular;
// Supabase ayarı değişirse yalnız burası güncellenir.

export const PASSWORD_MIN = 12

// Supabase'in "password_requirements: lower_upper_letters_digits_symbols" kümesi
export const PASSWORD_SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export type PasswordRule = 'length' | 'lower' | 'upper' | 'digit' | 'symbol'

export const PASSWORD_RULES: { id: PasswordRule; label: string; test: (pw: string) => boolean }[] = [
  { id: 'length', label: `En az ${PASSWORD_MIN} karakter`, test: (pw) => pw.length >= PASSWORD_MIN },
  { id: 'lower', label: 'Bir küçük harf (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'Bir büyük harf (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'digit', label: 'Bir rakam (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { id: 'symbol', label: 'Bir sembol (! @ # $ % gibi)', test: (pw) => [...pw].some((c) => PASSWORD_SYMBOLS.includes(c)) },
]

export const PASSWORD_HINT = `En az ${PASSWORD_MIN} karakter; büyük harf, küçük harf, rakam ve sembol içermeli.`

/** Karşılanmayan kurallar (boşsa şifre geçerli). */
export function checkPassword(pw: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw ?? '')).map((r) => r.id)
}

/** İlk eksik kural için kullanıcıya gösterilecek tek cümle; şifre geçerliyse null. */
export function passwordError(pw: string): string | null {
  const missing = checkPassword(pw)
  if (missing.length === 0) return null
  const parts = PASSWORD_RULES.filter((r) => missing.includes(r.id)).map((r) => r.label.toLocaleLowerCase('tr-TR'))
  return `Şifre şu kuralları karşılamıyor: ${parts.join(', ')}.`
}
