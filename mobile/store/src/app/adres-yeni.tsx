import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { useAddresses } from '@/lib/account'
import { supabase } from '@/lib/supabase'
import { Field, FormError } from '@/components/field'
import { SelectField } from '@/components/select-field'
import { TR_PROVINCES } from '@/lib/tr-provinces'
import { Button } from '@/components/ui'
import { colors, space } from '@/lib/theme'
import { composeAddressLines, fromAddressRow, toAddressMetadata } from '@/lib/address-format'

const PROVINCES = Object.keys(TR_PROVINCES).sort((a, b) => a.localeCompare(b, 'tr'))
const fold = (s: string) => (s || '').toLocaleLowerCase('tr-TR').trim()

// Eski adreslerde il alanına ilçe yazılmış olabiliyor ("yenimahalle", ilçe boş) → ili ilçeden bul
function fixCityDistrict(city: string, district: string) {
  const c = PROVINCES.find((p) => fold(p) === fold(city))
  if (c) return { city: c, district: TR_PROVINCES[c].find((d) => fold(d) === fold(district)) ?? '' }
  for (const cand of [city, district]) {
    const owners = PROVINCES.filter((p) => TR_PROVINCES[p].some((d) => fold(d) === fold(cand)))
    if (cand && owners.length === 1) return { city: owners[0], district: TR_PROVINCES[owners[0]].find((d) => fold(d) === fold(cand))! }
  }
  return { city: '', district: '' }
}

const EMPTY = {
  title: 'Ev', first_name: '', last_name: '', phone: '', district: '', city: '', postal_code: '',
  neighborhood: '', street: '', building_no: '', floor: '', apartment_no: '', description: '',
}

// Web ile aynı: 05XXXXXXXXX (iyzico buyer.gsmNumber bu alandan gider)
const normalizePhone = (p: string) => {
  const d = p.replace(/\D/g, '').replace(/^90/, '').replace(/^0?/, '0')
  return d
}

export default function AddressForm() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { session, profile } = useAuth()
  const { data: list } = useAddresses()
  const qc = useQueryClient()
  const [f, setF] = useState(EMPTY)
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    const existing = id ? list?.find((a) => a.id === id) : null
    if (existing) {
      setF({
        title: existing.title ?? '',
        first_name: existing.first_name,
        last_name: existing.last_name,
        phone: existing.phone,
        // Önce metadata; eski kayıtlarda açık adres metni ayrıştırılır
        ...(({ neighborhood, street, building_no, floor, apartment_no, description }) => ({
          neighborhood, street, building_no, floor, apartment_no, description,
        }))(fromAddressRow(existing)),
        ...fixCityDistrict(existing.city, existing.district ?? ''),
        postal_code: existing.postal_code ?? '',
      })
      setIsDefault(existing.is_default)
    } else if (!id) {
      setF((x) => ({ ...x, first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '', phone: profile?.phone ?? '' }))
      setIsDefault(!list?.length)
    }
  }, [id, list, profile])

  const save = async () => {
    setError(null)
    const phone = normalizePhone(f.phone)
    if (!f.first_name.trim() || !f.last_name.trim()) return setError('Ad ve soyad girin.')
    if (!/^05\d{9}$/.test(phone)) return setError('Telefonu 05XX XXX XX XX biçiminde girin.')
    if (!f.neighborhood.trim()) return setError('Mahalle girin.')
    if (f.street.trim().length < 3) return setError('Cadde / sokak girin.')
    if (!f.building_no.trim()) return setError('Bina no girin.')
    if (!TR_PROVINCES[f.city]) return setError('İl seçin.')
    if (!TR_PROVINCES[f.city].includes(f.district)) return setError('İlçe seçin.')
    setBusy(true)
    const uid = session!.user.id
    if (isDefault) await supabase.from('addresses').update({ is_default: false }).eq('user_id', uid)
    const row = {
      user_id: uid,
      title: f.title.trim() || 'Adres',
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      phone,
      ...(() => {
        const lines = composeAddressLines(f)
        return { address_line1: lines.address_line1, address_line2: lines.address_line2 || null }
      })(),
      metadata: toAddressMetadata(f),
      district: f.district.trim(),
      city: f.city.trim(),
      postal_code: f.postal_code.trim() || null,
      is_default: isDefault,
    }
    const { error: err } = id
      ? await supabase.from('addresses').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id)
      : await supabase.from('addresses').insert(row)
    setBusy(false)
    if (err) return setError(err.message)
    qc.invalidateQueries({ queryKey: ['addresses'] })
    router.back()
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(3) }} keyboardShouldPersistTaps="handled">
        <FormError text={error} />
        <Field label="Adres başlığı" value={f.title} onChangeText={set('title')} placeholder="Ev, İş…" />
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ flex: 1 }}>
            <Field label="Ad" value={f.first_name} onChangeText={set('first_name')} textContentType="givenName" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Soyad" value={f.last_name} onChangeText={set('last_name')} textContentType="familyName" />
          </View>
        </View>
        <Field label="Cep telefonu" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" textContentType="telephoneNumber" placeholder="05XX XXX XX XX" />
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ flex: 1 }}>
            <SelectField label="İl" value={f.city} options={PROVINCES} onChange={(city) => setF((x) => ({ ...x, city, district: '' }))} placeholder="İl seçin" />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="İlçe"
              value={f.district}
              options={TR_PROVINCES[f.city] ?? []}
              onChange={set('district')}
              disabled={!TR_PROVINCES[f.city]}
              placeholder={f.city ? 'İlçe seçin' : 'Önce il'}
            />
          </View>
        </View>
        <Field label="Mahalle" value={f.neighborhood} onChangeText={set('neighborhood')} placeholder="Örn. Turgut Özal" />
        <Field label="Cadde / Sokak" value={f.street} onChangeText={set('street')} textContentType="streetAddressLine1" placeholder="Örn. 2609. Sokak, Atakent Sitesi" />
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ flex: 1 }}>
            <Field label="Bina no" value={f.building_no} onChangeText={set('building_no')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Kat" value={f.floor} onChangeText={set('floor')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Daire" value={f.apartment_no} onChangeText={set('apartment_no')} />
          </View>
        </View>
        <Field label="Adres tarifi (isteğe bağlı)" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 60 }} />
        <Field label="Posta kodu (isteğe bağlı)" value={f.postal_code} onChangeText={set('postal_code')} keyboardType="number-pad" textContentType="postalCode" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: colors.primary }} />
          <Text style={{ color: colors.text }}>Varsayılan adresim olsun</Text>
        </View>
        <Button title="Kaydet" onPress={save} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
