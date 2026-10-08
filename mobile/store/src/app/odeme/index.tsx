import { useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, Switch, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth } from '@/providers/auth'
import { useCart } from '@/lib/cart'
import { useAddresses } from '@/lib/account'
import { supabase } from '@/lib/supabase'
import { WEB_URL, webApi } from '@/lib/api'
import { Field, FormError } from '@/components/field'
import { Button, Card, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import { fmtTRY } from '@/lib/format'
import { colors, space } from '@/lib/theme'

// Kargo tahmini: sunucu kuralıyla aynı (payment/initialize) — sepetteki mağazaların en düşük
// ücretsiz kargo eşiği (yoksa 500), standart 29,99. Kesin tutarı sunucu hesaplar; kupon
// indirimi de sunucuda doğrulanır ve iyzico formunda görünür.
const STANDARD_SHIPPING = 29.99

export default function Checkout() {
  const { session, profile } = useAuth()
  const { data: lines, isLoading } = useCart()
  const { data: addresses, isLoading: addrLoading } = useAddresses()
  const [addressId, setAddressId] = useState<string | null>(null)
  const [coupon, setCoupon] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!addressId && addresses?.length) setAddressId((addresses.find((a) => a.is_default) ?? addresses[0]).id)
  }, [addresses, addressId])

  const storeIds = useMemo(() => [...new Set((lines ?? []).map((l) => l.product.store_id).filter(Boolean))] as string[], [lines])
  const { data: thresholds } = useQuery({
    queryKey: ['shipping-thresholds', storeIds],
    enabled: storeIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('free_shipping_threshold').in('id', storeIds)
      return (data ?? []).map((s: any) => s.free_shipping_threshold).filter((t: any) => t !== null).map(Number)
    },
  })

  if (isLoading || addrLoading) return <Loading />
  const items = lines ?? []
  if (!items.length) return <Redirect href="/sepet" />

  const subtotal = items.reduce((s, l) => s + l.product.price * l.quantity, 0)
  const threshold = thresholds?.length ? Math.min(...thresholds) : 500
  const shipping = threshold === 0 || subtotal >= threshold ? 0 : STANDARD_SHIPPING
  const total = subtotal + shipping
  const address = addresses?.find((a) => a.id === addressId)

  const pay = async () => {
    setError(null)
    if (!address) return setError('Teslimat adresi seçin.')
    if (!accepted) return setError('Ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylayın.')
    setBusy(true)
    try {
      const res = await webApi<{ paymentPageUrl: string; orderId: string }>('/api/payment/initialize', {
        method: 'POST',
        body: {
          client: 'mobile',
          items: items.map((l) => ({ productId: l.product.id, name: l.product.name, price: l.product.price, quantity: l.quantity })),
          customer: {
            firstName: address.first_name,
            lastName: address.last_name,
            phone: address.phone,
            email: profile?.email ?? session?.user.email,
          },
          shippingAddress: {
            address: address.address_line1,
            city: address.city,
            district: address.district,
            postalCode: address.postal_code ?? '',
          },
          totalPrice: total,
          shippingCost: shipping,
          shippingMethod: 'standard',
          couponCode: coupon.trim().toUpperCase() || null,
        },
      })
      if (!res.paymentPageUrl || res.paymentPageUrl === '#') throw new Error('Ödeme sayfası alınamadı')
      router.push({ pathname: '/odeme/iyzico', params: { url: res.paymentPageUrl } })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <FormError text={error} />
        <Card>
          <Title>Teslimat adresi</Title>
          {addresses?.map((a) => (
            <Pressable key={a.id} onPress={() => setAddressId(a.id)} style={{ flexDirection: 'row', gap: space(3), paddingVertical: space(1) }}>
              <Ionicons name={a.id === addressId ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {a.title || 'Adres'} · {a.first_name} {a.last_name}
                </Text>
                <Muted>
                  {a.address_line1}, {a.district} / {a.city}
                </Muted>
              </View>
            </Pressable>
          ))}
          <Button title={addresses?.length ? 'Başka adres ekle' : 'Adres ekle'} variant="outline" onPress={() => router.push('/adres-yeni')} />
        </Card>

        <Card>
          <Title>Ürünler ({items.reduce((s, l) => s + l.quantity, 0)})</Title>
          {items.map((l) => (
            <Row key={l.id} label={`${l.quantity} × ${l.product.name}`} value={fmtTRY(l.product.price * l.quantity)} />
          ))}
        </Card>

        <Card>
          <Field label="Kupon kodu" value={coupon} onChangeText={setCoupon} autoCapitalize="characters" autoCorrect={false} placeholder="Varsa girin" />
          <Muted>Kupon indirimi ödeme sayfasında toplamdan düşülmüş olarak görünür.</Muted>
        </Card>

        <Card>
          <Row label="Ürünler" value={fmtTRY(subtotal)} />
          <Row label="Kargo" value={shipping ? fmtTRY(shipping) : 'Bedava'} />
          {shipping && threshold > 0 ? <Muted>{fmtTRY(threshold - subtotal)} daha ekleyin, kargo bedava olsun.</Muted> : null}
          <Row label="Toplam" value={<Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{fmtTRY(total)}</Text>} />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <Switch value={accepted} onValueChange={setAccepted} trackColor={{ true: colors.primary }} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
            <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`${WEB_URL}/mesafeli-satis-sozlesmesi`)}>
              Ön bilgilendirme formunu ve mesafeli satış sözleşmesini
            </Text>{' '}
            okudum, onaylıyorum.
          </Text>
        </View>
      </Screen>
      <View style={{ padding: space(4), backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border, gap: 6 }}>
        <Button title={`Ödemeye geç · ${fmtTRY(total)}`} onPress={pay} loading={busy} />
        <Muted style={{ textAlign: 'center' }}>Kart bilgileriniz iyzico güvenli ödeme sayfasında girilir; Novagross kart bilgisi saklamaz.</Muted>
      </View>
    </View>
  )
}
