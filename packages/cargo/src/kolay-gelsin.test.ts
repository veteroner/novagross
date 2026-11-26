import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickDistrict, findMessage, redactedBody, loginToken, fitKolayGelsinLabel } from './kolay-gelsin'

test('pickDistrict: { cityId, districts[] } biçimi', () => {
  assert.deepEqual(
    pickDistrict({ cityId: 6, districts: [{ districtId: 222813, districtName: 'YENİMAHALLE' }] }, 'Yenimahalle'),
    { cityId: 6, districtId: 222813 },
  )
})

test('pickDistrict: düz dizi ve birden fazla ilçede ad eşleşmesi', () => {
  const rows = [
    { cityId: 34, districtId: 34245, districtName: 'KADIKÖY' },
    { cityId: 34, districtId: 3398015, districtName: 'SANCAKTEPE' },
  ]
  assert.deepEqual(pickDistrict(rows, 'sancaktepe'), { cityId: 34, districtId: 3398015 })
})

test('pickDistrict: belirsiz eşleşmede 0 döner (yanlış ilçeye iş emri açılmaz)', () => {
  const rows = [
    { cityId: 34, districtId: 1, districtName: 'A' },
    { cityId: 34, districtId: 2, districtName: 'B' },
  ]
  assert.deepEqual(pickDistrict(rows, 'C'), { cityId: 0, districtId: 0 })
  assert.deepEqual(pickDistrict(null, 'C'), { cityId: 0, districtId: 0 })
})

test('findMessage iç içe hata metnini bulur', () => {
  assert.equal(findMessage({ isSuccess: false, result: { message: 'Kullanıcı bulunamadı' } }), 'Kullanıcı bulunamadı')
  assert.equal(findMessage({ isSuccess: false, errors: ['Şifre hatalı'] }), 'Şifre hatalı')
  assert.equal(findMessage({ isSuccess: false }), '')
})

test('redactedBody token ve şifreyi maskeler', () => {
  const out = redactedBody('{"isSuccess":false,"accessToken":"abc.def","sifre":"x1","message":"hata"}')
  assert.ok(!out.includes('abc.def') && !out.includes('x1'))
  assert.ok(out.includes('"message":"hata"'))
})

test('loginToken: IsSuccessful=false yanıtındaki token bulunur', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.payload.signature'
  assert.equal(loginToken({ StatusCode: 200, IsSuccessful: false, Token: jwt }), jwt)
  assert.equal(loginToken({ IsSuccessful: false, Result: { Token: jwt } }), jwt)
  assert.equal(loginToken({ isSuccess: true, result: jwt }), jwt)
})

test('loginToken: hata metni veya boş token kabul edilmez', () => {
  assert.equal(loginToken({ IsSuccessful: false, Result: 'Kullanıcı adı veya şifre hatalı' }), '')
  assert.equal(loginToken({ IsSuccessful: false, Token: '' }), '')
  assert.equal(loginToken({ IsSuccessful: false, Token: 'kisa' }), '')
  assert.equal(loginToken(null), '')
})

test('fitKolayGelsinLabel: uzun referans barkodu metne binmeyecek şekilde daraltılır', () => {
  const ref = 'NG-007586A0-D78C-45FB-A090-1312609DC9AE'
  const zpl = `^XA^PW800^FO50,10,^BY2,2,^BC,62,N,N,N,A^FD${ref}^FS^FO520,10^A0,40,40^FDX^FS^XZ`
  const out = fitKolayGelsinLabel(zpl)
  assert.ok(out.includes(`^FO50,10,^BY1,2,^BC,62,N,N,N,A^FD${ref}^FS`))
  assert.ok(out.includes('^FO520,10^A0,40,40^FDX^FS'))
})

test('fitKolayGelsinLabel: sığan kısa referansa dokunmaz', () => {
  const zpl = '^XA^FO50,10,^BY2,2,^BC,62,N,N,N,A^FD2601734273^FS^XZ'
  assert.equal(fitKolayGelsinLabel(zpl), zpl)
})
