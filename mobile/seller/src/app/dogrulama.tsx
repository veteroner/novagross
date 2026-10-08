import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useAuth } from '@/providers/auth'
import { Button, Muted } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

// İki adımlı doğrulama — web satıcı paneliyle aynı akış (apps/seller api/2fa/send + verify)
export default function TwoFactor() {
  const { session, verifyTwoFactor, sendTwoFactorCode, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) return setError('6 haneli kodu girin.')
    setBusy(true)
    setError(null)
    const err = await verifyTwoFactor(code, remember)
    setBusy(false)
    if (err) setError(err)
  }

  const resend = async () => {
    setError(null)
    const err = await sendTwoFactorCode()
    if (err) setError(err)
    else setInfo('Yeni kod gönderildi.')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.title}>Giriş doğrulama</Text>
        <Muted style={{ textAlign: 'center' }}>
          {session?.user.email} adresine gönderilen 6 haneli kodu girin. Kod 5 dakika geçerlidir.
        </Muted>

        <TextInput
          style={styles.code}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          autoFocus
          onSubmitEditing={submit}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text }}>Bu cihazı 2 gün hatırla</Text>
          <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.primary }} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info && !error ? <Text style={{ color: colors.success }}>{info}</Text> : null}

        <Button title="Doğrula" onPress={submit} loading={busy} />
        <Pressable onPress={resend} hitSlop={8}>
          <Text style={styles.link}>Kodu yeniden gönder</Text>
        </Pressable>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={[styles.link, { color: colors.muted }]}>Başka hesapla giriş yap</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: space(6), gap: space(4) },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  code: {
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    fontSize: 30,
    letterSpacing: 10,
    textAlign: 'center',
    fontWeight: '700',
  },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '600' },
})
