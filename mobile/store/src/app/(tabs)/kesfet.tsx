import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCategories, useProductList } from '@/lib/catalog'
import { ProductGrid } from '@/components/product'
import { Card, Empty, Loading, Screen } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

export default function Explore() {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 350)
    return () => clearTimeout(t)
  }, [text])

  const categories = useCategories(null)
  const results = useProductList({ search })
  const searching = search.trim().length >= 2

  return (
    <Screen>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space(3) }}
      >
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ürün ara"
          returnKeyType="search"
          autoCorrect={false}
          style={{ flex: 1, height: 44, fontSize: 15, color: colors.text }}
        />
        {text ? (
          <Pressable onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        results.isLoading ? (
          <Loading />
        ) : results.data?.length ? (
          <ProductGrid items={results.data} />
        ) : (
          <Empty text={`"${search}" için sonuç bulunamadı`} />
        )
      ) : (
        <Card style={{ padding: 0, gap: 0 }}>
          {(categories.data ?? []).map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/kategori/[id]', params: { id: c.id, name: c.name } })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: space(4),
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 15, color: colors.text }}>{c.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  )
}
