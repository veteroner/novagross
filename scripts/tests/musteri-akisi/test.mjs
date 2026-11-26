import assert from 'node:assert/strict'
const web = new URL('../../../apps/web/src/lib/', import.meta.url)
const { checkPassword, passwordError, PASSWORD_MIN } = await import(new URL('password-policy.ts', web))
const { translateAuthError } = await import(new URL('auth-errors.ts', web))
const { normalizePhone } = await import(new URL('phone.ts', web))
const { paymentErrorMessage } = await import(new URL('payment-errors.ts', web))

const results = []
const t = (name, fn) => { try { fn(); results.push(`GEÇTİ  ${name}`) } catch (e) { results.push(`KALDI  ${name}: ${e.message}`) } }

t('şifre: Öner\'in denediği Oner2621 reddedilir (uzunluk + sembol)', () => assert.deepEqual(checkPassword('Oner2621'), ['length', 'symbol']))
t('şifre: 12 karakter, dört sınıf geçer', () => assert.equal(passwordError('Kampanya-2026!'), null))
t('şifre: 11 karakter reddedilir', () => assert.deepEqual(checkPassword('Abcdefg1!xy'), ['length']))
t('şifre: büyük harfsiz', () => assert.deepEqual(checkPassword('kampanya-2026!'), ['upper']))
t('şifre: Supabase sembol kümesindeki ~ ve ` geçer', () => { assert.equal(passwordError('Kampanya2026~'), null); assert.equal(passwordError('Kampanya2026`'), null) })
t('şifre: Türkçe harf sembol sayılmaz', () => assert.deepEqual(checkPassword('Kampanyaşğü2026'), ['symbol']))
t('şifre: mesaj kuralları sayar', () => assert.match(passwordError('abc'), /12 karakter.*büyük harf.*rakam.*sembol/))
t('şifre: alt sınır 12', () => assert.equal(PASSWORD_MIN, 12))

const prodMsg = 'Password should be at least 12 characters. Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~.'
t('auth: canlıdaki Supabase mesajı artık "6 karakter" demez', () => { const m = translateAuthError(prodMsg); assert.ok(!/6 karakter/.test(m)); assert.match(m, /12 karakter/) })
t('auth: weak_password kodu + characters', () => assert.match(translateAuthError({ code: 'weak_password', message: 'x', reasons: ['characters'] }), /güçlü değil/))
t('auth: sızdırılmış şifre (pwned)', () => assert.match(translateAuthError({ code: 'weak_password', message: 'Password is known to be weak and easy to guess', reasons: ['pwned'] }), /sızdırılmış/))
t('auth: REST biçimi weak_password.reasons', () => assert.match(translateAuthError({ message: 'weak', code: 'weak_password', weak_password: { reasons: ['length'] } }), /12 karakter/))
t('auth: giriş hatası değişmedi', () => assert.equal(translateAuthError('Invalid login credentials'), 'E-posta veya şifre hatalı.'))
t('auth: string imzası geriye uyumlu', () => assert.match(translateAuthError('User already registered'), /zaten bir hesap/))
t('auth: boş girdi', () => assert.match(translateAuthError(null), /Bilinmeyen/))

for (const [inp, out] of [['0532 123 45 67', '05321234567'], ['+90 532 123 45 67', '05321234567'], ['905321234567', '05321234567'], ['(0532) 123-45-67', '05321234567'], ['5321234567', '05321234567'], ['0212 555 11 22', '02125551122'], ['0090 532 123 45 67', '05321234567']]) {
  t(`telefon: "${inp}" → ${out} (DB regex'ine uyar)`, () => { const n = normalizePhone(inp); assert.equal(n, out); assert.match(n, /^(\+90|0)?[0-9]{10}$/) })
}
for (const bad of ['0532 123 45', '053212345678', 'abc', '', '0032 123 45 67']) {
  t(`telefon: "${bad}" reddedilir`, () => assert.equal(normalizePhone(bad), null))
}

t('ödeme hatası: amount_mismatch Türkçe', () => assert.match(paymentErrorMessage('amount_mismatch'), /incelemeye alındı/))
t('ödeme hatası: bilinmeyen kod metin olarak', () => assert.equal(paymentErrorMessage(encodeURIComponent('Kart limiti yetersiz')), 'Kart limiti yetersiz'))
t('ödeme hatası: bozuk kodlama çökmez', () => assert.equal(typeof paymentErrorMessage('%E0%A4%A'), 'string'))
t('ödeme hatası: boş', () => assert.equal(paymentErrorMessage(null), null))

console.log(results.join('\n'))
if (results.some((r) => r.startsWith('KALDI'))) process.exit(1)
