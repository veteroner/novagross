import { Alert, Linking, Pressable, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth } from '@/providers/auth'
import { useNotifications } from '@/lib/account'
import { LoginPrompt } from '@/components/login-prompt'
import { Button, Card, Muted, Screen, Title } from '@/components/ui'
import { WEB_URL } from '@/lib/api'
import { colors, space } from '@/lib/theme'

function Item({ icon, label, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3), opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{label}</Text>
      {badge ? (
        <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

export default function Account() {
  const { session, profile, signOut, deleteAccount } = useAuth()
  const { data: notifications } = useNotifications()
  if (!session) return <LoginPrompt text="Siparişlerinizi, adreslerinizi ve bildirimlerinizi görmek için giriş yapın." />

  const unread = notifications?.filter((n) => !n.read_at).length ?? 0
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const go = (href: Href) => () => router.push(href)

  // App Store kuralı 5.1.1(v): hesap silme uygulama içinden yapılabilmeli
  const confirmDelete = () =>
    Alert.alert(
      'Hesabınız silinsin mi?',
      'Adresleriniz, sepetiniz, favorileriniz ve bildirim tercihleriniz silinir; hesabınız kalıcı olarak kapatılır. Geçmiş siparişlerinizin fatura kayıtları yasal saklama süresince tutulur. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı sil',
          style: 'destructive',
          onPress: async () => {
            const err = await deleteAccount()
            if (err) Alert.alert('Hesap silinemedi', err)
          },
        },
      ]
    )

  return (
    <Screen>
      <Card>
        <Title>{name || 'Hesabım'}</Title>
        <Muted>{profile?.email ?? session.user.email}</Muted>
      </Card>
      <Card style={{ gap: 0, paddingVertical: space(1) }}>
        <Item icon="receipt-outline" label="Siparişlerim" onPress={go('/siparisler')} />
        <Item icon="person-outline" label="Profilim ve şifre" onPress={go('/profil')} />
        <Item icon="location-outline" label="Adreslerim" onPress={go('/adresler')} />
        <Item icon="notifications-outline" label="Bildirimler" badge={unread} onPress={go('/bildirimler')} />
        <Item icon="options-outline" label="Bildirim ayarları" onPress={go('/bildirim-ayarlari')} />
      </Card>
      <Card style={{ gap: 0, paddingVertical: space(1) }}>
        <Item icon="help-circle-outline" label="Sıkça sorulan sorular" onPress={() => Linking.openURL(`${WEB_URL}/sikca-sorulan-sorular`)} />
        <Item icon="chatbubbles-outline" label="İletişim" onPress={() => Linking.openURL(`${WEB_URL}/iletisim`)} />
        <Item icon="document-text-outline" label="KVKK aydınlatma metni" onPress={() => Linking.openURL(`${WEB_URL}/kvkk`)} />
      </Card>
      <Button title="Çıkış yap" variant="outline" onPress={signOut} />
      <Pressable onPress={confirmDelete} style={{ paddingVertical: space(3) }}>
        <Text style={{ color: colors.danger, textAlign: 'center' }}>Hesabımı sil</Text>
      </Pressable>
    </Screen>
  )
}
