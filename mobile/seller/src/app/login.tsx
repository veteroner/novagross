import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuth } from '@/providers/auth'
import { Button, Muted } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

export default function Login() {
  const { signIn, notSeller, signOut, session } = useAuth()
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
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.brand}>novagross</Text>
        <Text style={styles.subtitle}>Satıcı Paneli</Text>

        {session && notSeller ? (
          <View style={{ gap: space(3) }}>
            <Text style={styles.error}>Bu hesap bir mağazaya bağlı değil. Satıcı hesabınızla giriş yapın.</Text>
            <Button title="Başka hesapla giriş yap" variant="outline" onPress={signOut} />
          </View>
        ) : (
          <View style={{ gap: space(3) }}>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Giriş yap" onPress={submit} loading={busy} />
            <Muted style={{ textAlign: 'center' }}>Satıcı hesabınız yoksa seller.novagross.com üzerinden başvurun.</Muted>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: space(6), gap: space(2) },
  brand: { fontSize: 36, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center', marginBottom: space(6) },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: space(4),
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 14 },
})
