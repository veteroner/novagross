import { useEffect, useState } from 'react'
import { passwordError, PASSWORD_HINT } from '@/lib/password-policy'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useAuth } from '@/providers/auth'
import { supabase } from '@/lib/supabase'
import { Field, FormError } from '@/components/field'
import { Button, Card, Muted, Title } from '@/components/ui'
import { colors, space } from '@/lib/theme'

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth()
  const [f, setF] = useState({ first_name: '', last_name: '', phone: '' })
  const [pw, setPw] = useState({ next: '', again: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setF({ first_name: profile?.first_name ?? '', last_name: profile?.last_name ?? '', phone: profile?.phone ?? '' })
  }, [profile])

  const save = async () => {
    setError(null)
    if (!f.first_name.trim() || !f.last_name.trim()) return setError('Ad ve soyad girin.')
    setBusy('profile')
    const { error: err } = await supabase
      .from('profiles')
      .update({ first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: f.phone.trim() || null })
      .eq('id', session!.user.id)
    setBusy(null)
    if (err) return setError(err.message)
    await refreshProfile()
    Alert.alert('Kaydedildi')
  }

  const changePassword = async () => {
    setError(null)
    const pwError = passwordError(pw.next)
    if (pwError) return setError(pwError)
    if (pw.next !== pw.again) return setError('Şifreler eşleşmiyor.')
    setBusy('password')
    const { error: err } = await supabase.auth.updateUser({ password: pw.next })
    setBusy(null)
    if (err) return setError(/different from the old/i.test(err.message) ? 'Yeni şifre eskisiyle aynı olamaz.' : (/Password should|weak_password|known to be weak/i.test(err.message) ? `Şifre yeterince güçlü değil. ${PASSWORD_HINT}` : err.message))
    setPw({ next: '', again: '' })
    Alert.alert('Şifreniz değiştirildi')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(3) }} keyboardShouldPersistTaps="handled">
        <FormError text={error} />
        <Card>
          <Title>Bilgilerim</Title>
          <Muted>{session?.user.email}</Muted>
          <Field label="Ad" value={f.first_name} onChangeText={(v) => setF((x) => ({ ...x, first_name: v }))} textContentType="givenName" />
          <Field label="Soyad" value={f.last_name} onChangeText={(v) => setF((x) => ({ ...x, last_name: v }))} textContentType="familyName" />
          <Field label="Cep telefonu" value={f.phone} onChangeText={(v) => setF((x) => ({ ...x, phone: v }))} keyboardType="phone-pad" textContentType="telephoneNumber" />
          <Button title="Kaydet" onPress={save} loading={busy === 'profile'} />
        </Card>
        <Card>
          <Title>Şifre değiştir</Title>
          <Field label="Yeni şifre" value={pw.next} onChangeText={(v) => setPw((x) => ({ ...x, next: v }))} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
          <Field label="Yeni şifre (tekrar)" value={pw.again} onChangeText={(v) => setPw((x) => ({ ...x, again: v }))} secureTextEntry textContentType="newPassword" />
          <Button title="Şifreyi değiştir" variant="outline" onPress={changePassword} loading={busy === 'password'} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
