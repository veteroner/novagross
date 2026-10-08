import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/providers/auth'
import { Field, FormError } from '@/components/field'
import { Button, Muted } from '@/components/ui'
import { WEB_URL } from '@/lib/api'
import { colors, space } from '@/lib/theme'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email || !password) return setError('E-posta ve şifre girin.')
    setBusy(true)
    setError(null)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) setError(err)
    else if (router.canGoBack()) router.back()
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(4) }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center', marginVertical: space(4) }}>novagross</Text>
        <FormError text={error} />
        <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
        <Button title="Giriş yap" onPress={submit} loading={busy} />
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/sifremi-unuttum`)}>
          <Text style={{ color: colors.primary, textAlign: 'center' }}>Şifremi unuttum</Text>
        </Pressable>
        <Muted style={{ textAlign: 'center' }}>Hesabınız yok mu?</Muted>
        <Button title="Üye ol" variant="outline" onPress={() => router.replace('/kayit')} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
