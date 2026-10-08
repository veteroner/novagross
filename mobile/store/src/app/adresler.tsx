import { Alert, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAddresses } from '@/lib/account'
import { supabase } from '@/lib/supabase'
import { Badge, Button, Card, Empty, Loading, Muted, Screen } from '@/components/ui'
import { colors, space } from '@/lib/theme'

export default function Addresses() {
  const { data, isLoading } = useAddresses()
  const qc = useQueryClient()
  if (isLoading) return <Loading />

  const remove = (id: string) =>
    Alert.alert('Adres silinsin mi?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('addresses').delete().eq('id', id)
          qc.invalidateQueries({ queryKey: ['addresses'] })
        },
      },
    ])

  return (
    <Screen>
      {data?.length ? (
        data.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>{a.title || 'Adres'}</Text>
              {a.is_default ? <Badge label="Varsayılan" tone="primary" /> : null}
            </View>
            <Text style={{ color: colors.text }}>
              {a.first_name} {a.last_name} · {a.phone}
            </Text>
            <Muted>
              {a.address_line1}, {a.district} / {a.city}
            </Muted>
            <View style={{ flexDirection: 'row', gap: space(4) }}>
              <Text style={{ color: colors.primary }} onPress={() => router.push({ pathname: '/adres-yeni', params: { id: a.id } })}>
                Düzenle
              </Text>
              <Text style={{ color: colors.danger }} onPress={() => remove(a.id)}>
                Sil
              </Text>
            </View>
          </Card>
        ))
      ) : (
        <Empty text="Kayıtlı adresiniz yok" />
      )}
      <Button title="Yeni adres ekle" onPress={() => router.push('/adres-yeni')} />
    </Screen>
  )
}
