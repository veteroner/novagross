import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/providers/auth'
import { Field, FormError } from '@/components/field'
import { Button, Muted } from '@/components/ui'
import { WEB_URL } from '@/lib/api'
import { colors, space } from '@/lib/theme'

export default function Register() {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Ad ve soyad girin.')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Geçerli bir e-posta girin.')
    if (form.password.length < 8) return setError('Şifre en az 8 karakter olmalı.')
    if (!accepted) return setError('Üyelik sözleşmesini ve KVKK aydınlatma metnini onaylayın.')
    setBusy(true)
    const msg = await signUp(form)
    setBusy(false)
    if (!msg) {
      if (router.canGoBack()) router.back()
    } else if (msg.startsWith('Kayıt tamamlandı')) setInfo(msg)
    else setError(msg)
  }

  if (info)
    return (
      <View style={{ flex: 1, padding: space(6), gap: space(4), justifyContent: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>E-postanızı doğrulayın</Text>
        <Muted>{info}</Muted>
        <Button title="Giriş ekranına dön" onPress={() => router.replace('/giris')} />
      </View>
    )

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(4) }} keyboardShouldPersistTaps="handled">
        <FormError text={error} />
        <Field label="Ad" value={form.firstName} onChangeText={set('firstName')} autoComplete="given-name" textContentType="givenName" />
        <Field label="Soyad" value={form.lastName} onChangeText={set('lastName')} autoComplete="family-name" textContentType="familyName" />
        <Field label="E-posta" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Şifre" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="En az 8 karakter" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <Switch value={accepted} onValueChange={setAccepted} trackColor={{ true: colors.primary }} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`${WEB_URL}/sozlesmeler/uyelik-sozlesmesi`)}>
              Üyelik sözleşmesini
            </Text>{' '}
            ve{' '}
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`${WEB_URL}/kvkk`)}>
              KVKK aydınlatma metnini
            </Text>{' '}
            okudum, kabul ediyorum.
          </Text>
        </View>
        <Muted>Kampanya bildirimleri varsayılan olarak kapalıdır; dilerseniz Hesabım › Bildirim ayarları'ndan açabilirsiniz.</Muted>
        <Button title="Üye ol" onPress={submit} loading={busy} />
        <Pressable onPress={() => router.replace('/giris')}>
          <Text style={{ color: colors.primary, textAlign: 'center' }}>Zaten üyeyim, giriş yap</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
