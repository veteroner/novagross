import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickDistrict, findMessage, redactedBody } from './kolay-gelsin'

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
