import { useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useCategories, useProductList } from '@/lib/catalog'
import { ProductGrid } from '@/components/product'
import { Empty, Loading, Screen } from '@/components/ui'
import { colors, space } from '@/lib/theme'

const SORTS = [
  { key: 'new', label: 'En yeni' },
  { key: 'price_asc', label: 'En düşük fiyat' },
  { key: 'price_desc', label: 'En yüksek fiyat' },
] as const

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primarySoft : '#fff',
      }}
    >
      <Text style={{ fontSize: 13, color: active ? colors.primaryDark : colors.text, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </Pressable>
  )
}

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>()
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('new')
  const children = useCategories(id)
  const products = useProductList({ categoryId: id, sort })

  return (
    <Screen refreshing={products.isRefetching} onRefresh={products.refetch}>
      <Stack.Screen options={{ title: name || 'Kategori' }} />
      {children.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
          {children.data.map((c) => (
            <Chip key={c.id} label={c.name} onPress={() => router.push({ pathname: '/kategori/[id]', params: { id: c.id, name: c.name } })} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>
      {products.isLoading ? <Loading /> : products.data?.length ? <ProductGrid items={products.data} /> : <Empty text="Bu kategoride ürün yok" />}
    </Screen>
  )
}
