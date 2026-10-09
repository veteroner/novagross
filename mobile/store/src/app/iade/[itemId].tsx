import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { webApi } from '@/lib/api'
import { Field, FormError } from '@/components/field'
import { Button, Card, Muted, Title } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

// apps/web /api/returns/create ile aynı nedenler; 14 gün / teslim kontrolü sunucuda (trigger).
const REASONS = [
  { key: 'defective', label: 'Ürün kusurlu / bozuk' },
  { key: 'wrong_item', label: 'Yanlış ürün gönderildi' },
  { key: 'not_as_described', label: 'Açıklamadaki gibi değil' },
  { key: 'damaged_in_shipping', label: 'Kargoda hasar gördü' },
  { key: 'changed_mind', label: 'Vazgeçtim (cayma hakkı)' },
  { key: 'late_delivery', label: 'Geç teslim edildi' },
  { key: 'other', label: 'Diğer' },
] as const

export default function ReturnRequest() {
  const { itemId, orderId, name, max } = useLocalSearchParams<{ itemId: string; orderId: string; name: string; max: string }>()
  const qc = useQueryClient()
  const maxQty = Math.max(1, Number(max) || 1)
  const [qty, setQty] = useState(1)
  const [category, setCategory] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (!category) return setError('İade nedenini seçin.')
    if (reason.trim().length < 10) return setError('Açıklama en az 10 karakter olmalı.')
    setBusy(true)
    try {
      await webApi('/api/returns/create', {
        method: 'POST',
        body: { orderId, orderItemId: itemId, quantity: qty, reasonCategory: category, reason: reason.trim() },
      })
      qc.invalidateQueries({ queryKey: ['order', orderId] })
      Alert.alert('İade talebiniz alındı', 'Talebiniz incelendikten sonra size bildirim göndereceğiz. Onaylanırsa iade kargo kodunuz sipariş sayfasında görünür.', [
        { text: 'Tamam', onPress: () => router.back() },
      ])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(3) }} keyboardShouldPersistTaps="handled">
        <Card>
          <Title>{name}</Title>
          {maxQty > 1 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <Muted>Adet</Muted>
              <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={26} color={colors.primary} />
              </Pressable>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{qty}</Text>
              <Pressable onPress={() => setQty((q) => Math.min(maxQty, q + 1))} hitSlop={8}>
                <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </Card>
        <FormError text={error} />
        <Card style={{ gap: 0, paddingVertical: space(1) }}>
          {REASONS.map((r) => (
            <Pressable key={r.key} onPress={() => setCategory(r.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) }}>
              <Ionicons name={category === r.key ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.primary} />
              <Text style={{ color: colors.text }}>{r.label}</Text>
            </Pressable>
          ))}
        </Card>
        <Field label="Açıklama" value={reason} onChangeText={setReason} multiline style={{ minHeight: 100, borderRadius: radius.md }} placeholder="Sorunu kısaca anlatın (en az 10 karakter)" />
        <Muted>Teslimden itibaren 14 gün içinde iade talep edebilirsiniz. Ürünü orijinal ambalajı ve faturasıyla göndermeniz gerekir.</Muted>
        <Button title="İade talebi gönder" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
