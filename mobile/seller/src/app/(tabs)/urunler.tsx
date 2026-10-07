import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { router, Stack } from 'expo-router'
import { APPROVAL, useProducts } from '@/lib/products'
import { Badge, Card, Empty, Muted } from '@/components/ui'
import { fmtTRY } from '@/lib/format'
import { colors, radius, space } from '@/lib/theme'

export default function Products() {
  const { data = [], isFetching, refetch } = useProducts()
  const [q, setQ] = useState('')
  const list = useMemo(
    () => (q.trim() ? data.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : data),
    [data, q]
  )
  const pending = data.filter((p) => p.approval_status === 'pending').length

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/urun/yeni')} hitSlop={10} style={{ marginRight: space(4) }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>+ Yeni</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: space(4), gap: space(3) }}
        data={list}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={{ gap: space(2) }}>
            <TextInput
              placeholder="Ürün ara"
              value={q}
              onChangeText={setQ}
              style={{ height: 44, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space(3) }}
            />
            {pending > 0 ? <Muted>{pending} ürün admin onayı bekliyor</Muted> : null}
          </View>
        }
        ListEmptyComponent={<Empty text="Ürün yok — sağ üstten yeni ürün ekleyin" />}
        renderItem={({ item: p }) => {
          const a = APPROVAL[p.approval_status] ?? { label: p.approval_status, tone: 'warning' as const }
          return (
            <Card onPress={() => router.push({ pathname: '/urun/[id]', params: { id: p.id } })}>
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <Image
                  source={p.image ?? undefined}
                  style={{ width: 64, height: 64, borderRadius: radius.sm, backgroundColor: '#F3F4F6' }}
                  contentFit="cover"
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: '600' }} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: space(2), alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={a.label} tone={a.tone} />
                    {!p.is_active ? <Badge label="Satışta değil" /> : null}
                    {p.pending_changes_status === 'pending' ? <Badge label="Değişiklik onayda" tone="primary" /> : null}
                    {p.pending_changes_status === 'rejected' ? <Badge label="Değişiklik reddedildi" tone="danger" /> : null}
                    {p.stock <= 0 ? <Badge label="Stok yok" tone="danger" /> : null}
                  </View>
                  <Muted>
                    {fmtTRY(p.price)} · Stok {p.stock}
                  </Muted>
                </View>
              </View>
            </Card>
          )
        }}
      />
    </>
  )
}
