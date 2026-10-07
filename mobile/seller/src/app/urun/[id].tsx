import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { APPROVAL, useProducts } from '@/lib/products'
import { supabase } from '@/lib/supabase'
import { Badge, Button, Card, Empty, Loading, Muted, Screen, Title } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

export default function ProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const { data, isLoading } = useProducts()
  const p = data?.find((x) => x.id === id)

  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!p) return
    setPrice(String(p.price))
    setStock(String(p.stock))
    setActive(p.is_active)
  }, [p?.id])

  if (isLoading) return <Loading />
  if (!p) return <Empty text="Ürün bulunamadı" />
  const a = APPROVAL[p.approval_status] ?? { label: p.approval_status, tone: 'warning' as const }

  const save = async () => {
    const priceN = Number(price.replace(',', '.'))
    const stockN = Number.parseInt(stock, 10)
    if (!Number.isFinite(priceN) || priceN <= 0) return Alert.alert('Geçersiz fiyat')
    if (!Number.isInteger(stockN) || stockN < 0) return Alert.alert('Geçersiz stok')
    setSaving(true)
    // Fiyat/stok/yayın durumu onay gerektirmez (enforce_product_moderation yalnızca
    // INSERT'te pending'e zorlar; approval_status'u satıcı değiştiremez).
    const { error } = await supabase.from('products').update({ price: priceN, stock: stockN, is_active: active }).eq('id', p.id)
    setSaving(false)
    if (error) return Alert.alert('Kaydedilemedi', error.message)
    await qc.invalidateQueries({ queryKey: ['products'] })
    Alert.alert('Kaydedildi')
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Ürün' }} />
      <Card>
        {p.image ? <Image source={p.image} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md }} contentFit="cover" /> : null}
        <Title>{p.name}</Title>
        <Badge label={a.label} tone={a.tone} />
        {p.approval_status === 'rejected' && p.rejection_reason ? (
          <Text style={{ color: colors.danger }}>Red nedeni: {p.rejection_reason}</Text>
        ) : null}
        {p.approval_status === 'pending' ? <Muted>Admin onayından sonra mağazanızda yayınlanır; size bildirim gelir.</Muted> : null}
      </Card>

      <Card style={{ gap: space(3) }}>
        <Title>Hızlı düzenleme</Title>
        <Text style={styles.label}>Fiyat (₺, KDV dahil)</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <Text style={styles.label}>Stok</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={stock} onChangeText={setStock} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Satışta</Text>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
        </View>
        <Button title="Kaydet" onPress={save} loading={saving} />
      </Card>
      <Muted>Açıklama, görsel ve kategori düzenlemesi şimdilik satıcı panelinde (web).</Muted>
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: space(3),
    fontSize: 16,
  },
})
