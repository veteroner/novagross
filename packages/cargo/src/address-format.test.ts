import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  composeAddressLines,
  fromAddressRow,
  fullAddressLine,
  parseAddressLines,
  toAddressMetadata,
} from './address-format'

const live = {
  neighborhood: 'Turgut Özal',
  street: '2609 sokak Atakent 2 Sitesi',
  building_no: 'C blok',
  floor: '11',
  apartment_no: '45',
  description: '',
}

test('Adreslerim formatı ayrıştırılır (canlı örnek)', () => {
  const r = parseAddressLines('Turgut Özal Mah. 2609 sokak Atakent 2 Sitesi No: C blok', 'Kat: 11 Daire: 45')
  assert.deepEqual(r, live)
})

test('eski ödeme formatı ayrıştırılır', () => {
  const r = parseAddressLines('Atatürk Cad. No: 5 K: 2 D: 3 Kızılay Mah.', 'Market yanı')
  assert.deepEqual(r, {
    neighborhood: 'Kızılay',
    street: 'Atatürk Cad.',
    building_no: '5',
    floor: '2',
    apartment_no: '3',
    description: 'Market yanı',
  })
})

test('serbest metin cadde/sokak alanına kalır', () => {
  const r = parseAddressLines('Bağlarbaşı sk 12/3', null)
  assert.equal(r.street, 'Bağlarbaşı sk 12/3')
  assert.equal(r.neighborhood, '')
})

test('compose → fromAddressRow gidiş-dönüş (metadata ile)', () => {
  const lines = composeAddressLines(live)
  const back = fromAddressRow({ ...lines, metadata: toAddressMetadata(live) })
  assert.equal(back.street, live.street)
  assert.equal(back.neighborhood, live.neighborhood)
  assert.equal(back.floor, '11')
  assert.equal(back.apartment_no, '45')
})

test('compose → fromAddressRow gidiş-dönüş (metadata olmadan)', () => {
  const back = fromAddressRow(composeAddressLines(live))
  assert.deepEqual({ ...back, postal_code: undefined, latitude: undefined, longitude: undefined }, {
    ...live,
    postal_code: undefined,
    latitude: undefined,
    longitude: undefined,
  })
})

test('fullAddressLine kat/daire dahil tam adres üretir; full_address varsa onu kullanır', () => {
  assert.equal(
    fullAddressLine({
      address_line1: 'Turgut Özal Mah. 2609 sokak Atakent 2 Sitesi No: C blok',
      address_line2: 'Kat: 11 Daire: 45',
    }),
    'Turgut Özal Mah. 2609 sokak Atakent 2 Sitesi No: C blok Kat: 11 Daire: 45'
  )
  assert.equal(fullAddressLine({ full_address: 'X', address_line1: 'Y' }), 'X')
  assert.equal(fullAddressLine({ address_line1: 'Sadece sokak' }), 'Sadece sokak')
})

test('mahalle "Mah." soneki tekrarlanmaz', () => {
  const { address_line1 } = composeAddressLines({ ...live, neighborhood: 'Turgut Özal Mah.' })
  assert.ok(address_line1.startsWith('Turgut Özal Mah. 2609'))
})
