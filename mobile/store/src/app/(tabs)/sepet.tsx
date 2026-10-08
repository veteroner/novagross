import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCart, useCartActions } from '@/lib/cart'
import { useAuth } from '@/providers/auth'
import { LoginPrompt } from '@/components/login-prompt'
import { Button, Card, Empty, Loading, Muted, Row, Screen } from '@/components/ui'
import { fmtTRY } from '@/lib/format'
import { colors, radius, space } from '@/lib/theme'

function Stepper({ value, max, onChange, busy }: { value: number; max: number; onChange: (n: number) => void; busy: boolean }) {
  const btn = (icon: 'remove' | 'add' | 'trash-outline', next: number, disabled = false) => (
    <Pressable
      hitSlop={6}
      disabled={busy || disabled}
      onPress={() => onChange(next)}
      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: busy || disabled ? 0.4 : 1 }}
    >
      <Ionicons name={icon} size={18} color={icon === 'trash-outline' ? colors.danger : colors.text} />
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }}>
      {value <= 1 ? btn('trash-outline', 0) : btn('remove', value - 1)}
      <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '600' }}>{value}</Text>
      {btn('add', value + 1, value >= max)}
    </View>
  )
}

export default function CartScreen() {
  const { session } = useAuth()
  const { data, isLoading, refetch, isRefetching } = useCart()
  const { setQuantity } = useCartActions()

  if (!session) return <LoginPrompt text="Sepetinizi görmek ve alışveriş yapmak için giriş yapın." />
  if (isLoading) return <Loading />
  const lines = data ?? []
  if (!lines.length)
    return (
      <Screen>
        <Empty text="Sepetiniz boş" />
        <Button title="Alışverişe başla" variant="outline" onPress={() => router.push('/')} />
      </Screen>
    )

  const outOfStock = lines.filter((l) => l.product.stock < l.quantity)
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        {lines.map((l) => (
          <Card key={l.id} style={{ flexDirection: 'row', gap: space(3) }}>
            <Pressable onPress={() => router.push({ pathname: '/urun/[id]', params: { id: l.product.id } })}>
              <Image source={l.product.image ?? undefined} style={{ width: 76, height: 76, borderRadius: radius.sm, backgroundColor: '#F3F4F6' }} />
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text numberOfLines={2} style={{ fontSize: 14, color: colors.text }}>
                {l.product.name}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stepper
                  value={l.quantity}
                  max={l.product.stock}
                  busy={setQuantity.isPending}
                  onChange={(n) => setQuantity.mutate({ lineId: l.id, quantity: n })}
                />
                <Text style={{ fontWeight: '700', color: colors.text }}>{fmtTRY(l.product.price * l.quantity)}</Text>
              </View>
              {l.product.stock < l.quantity ? (
                <Text style={{ fontSize: 12, color: colors.danger }}>
                  {l.product.stock <= 0 ? 'Stokta yok, sepetten çıkarın' : `Stokta yalnızca ${l.product.stock} adet var`}
                </Text>
              ) : null}
            </View>
          </Card>
        ))}
        <Card>
          <Row label="Ürünler" value={fmtTRY(subtotal)} />
          <Muted>Kargo ve kupon indirimi ödeme adımında hesaplanır.</Muted>
        </Card>
      </Screen>
      <View style={{ padding: space(4), backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border }}>
        <Button
          title={`Sepeti onayla · ${fmtTRY(subtotal)}`}
          disabled={outOfStock.length > 0}
          onPress={() => router.push('/odeme')}
        />
      </View>
    </View>
  )
}
