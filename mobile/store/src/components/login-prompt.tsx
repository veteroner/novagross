import { View } from 'react-native'
import { router } from 'expo-router'
import { Button, Muted, Title } from '@/components/ui'
import { space } from '@/lib/theme'

export function LoginPrompt({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: space(6), gap: space(3) }}>
      <Title>Giriş yapın</Title>
      <Muted>{text}</Muted>
      <Button title="Giriş yap" onPress={() => router.push('/giris')} />
      <Button title="Üye ol" variant="outline" onPress={() => router.push('/kayit')} />
    </View>
  )
}
