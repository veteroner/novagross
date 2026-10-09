import { Alert, Linking, Text, View } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import { useAuth } from '@/providers/auth'
import { Button, Card, Muted, Row, Screen, Title } from '@/components/ui'
import { space } from '@/lib/theme'

const ROLE: Record<string, string> = { owner: 'Sahip', manager: 'Yönetici', staff: 'Personel' }
const WEB = process.env.EXPO_PUBLIC_SELLER_API_URL || 'https://seller.novagross.com'

export default function More() {
  const { store, session, signOut } = useAuth()

  return (
    <Screen>
      <Card>
        <Title>{store?.storeName}</Title>
        <Row label="Hesap" value={session?.user.email ?? '-'} />
        <Row label="Rol" value={ROLE[store?.role ?? 'staff']} />
      </Card>

      <Card onPress={() => router.push('/bildirim-ayarlari')}>
        <Text style={{ fontWeight: '600' }}>Bildirim ayarları</Text>
        <Muted>Hangi bildirimleri alacağınızı seçin</Muted>
      </Card>

      <Card onPress={() => router.push('/kazanclarim')}>
        <Text style={{ fontWeight: '600' }}>Kazançlarım</Text>
        <Muted>Hak edişler, komisyon, stopaj ve iyzico gönderim durumu</Muted>
      </Card>

      <Card onPress={() => router.push('/iadeler')}>
        <Text style={{ fontWeight: '600' }}>İade talepleri</Text>
        <Muted>Müşteri iadelerinin durumu</Muted>
      </Card>

      <Card onPress={() => router.push('/sorular')}>
        <Text style={{ fontWeight: '600' }}>Soru-cevap ve yorumlar</Text>
        <Muted>Ürün sorularını ve yorumları yanıtlayın</Muted>
      </Card>

      <Card onPress={() => Linking.openURL(`${WEB}/raporlar`)}>
        <Text style={{ fontWeight: '600' }}>Raporlar ve mağaza ayarları</Text>
        <Muted>Satıcı panelinde açılır</Muted>
      </Card>

      <View style={{ marginTop: space(4) }}>
        <Button
          title="Çıkış yap"
          variant="outline"
          onPress={() =>
            Alert.alert('Çıkış yap', 'Bu cihaz artık bildirim almayacak.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Çıkış yap', style: 'destructive', onPress: signOut },
            ])
          }
        />
      </View>
      <Muted style={{ textAlign: 'center' }}>Novagross Satıcı {Constants.expoConfig?.version}</Muted>
    </Screen>
  )
}
