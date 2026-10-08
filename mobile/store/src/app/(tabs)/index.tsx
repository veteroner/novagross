import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useHome } from '@/lib/catalog'
import { ProductGrid } from '@/components/product'
import { Empty, Loading, Screen, Title } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

// Banner link_type: product | category | url (web ile aynı alanlar)
function openBanner(b: { link_type: string | null; link_value: string | null }) {
  if (!b.link_value) return
  if (b.link_type === 'product') router.push({ pathname: '/urun/[id]', params: { id: b.link_value } })
  else if (b.link_type === 'category') router.push({ pathname: '/kategori/[id]', params: { id: b.link_value } })
}

export default function Home() {
  const { data, isLoading, refetch, isRefetching } = useHome()
  const { width } = useWindowDimensions()
  if (isLoading) return <Loading />

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Pressable
        onPress={() => router.push('/kesfet')}
        style={{ backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space(3) }}
      >
        <Text style={{ color: colors.muted }}>Ürün, kategori ara…</Text>
      </Pressable>

      {data?.banners.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(4) }}>
          {data.banners.map((b) => (
            <Pressable key={b.id} onPress={() => openBanner(b)} style={{ width, paddingHorizontal: space(4) }}>
              <Image
                source={b.image_url}
                style={{ width: '100%', aspectRatio: 2.4, borderRadius: radius.lg, backgroundColor: '#F3F4F6' }}
                contentFit="cover"
                accessibilityLabel={b.title}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {data?.categories.length ? (
        <>
          <Title>Kategoriler</Title>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(3) }}>
            {data.categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: '/kategori/[id]', params: { id: c.id, name: c.name } })}
                style={{ width: 76, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.primarySoft }}>
                  {c.image_url ? <Image source={c.image_url} style={{ width: 64, height: 64 }} contentFit="cover" /> : null}
                </View>
                <Text numberOfLines={2} style={{ fontSize: 12, textAlign: 'center', color: colors.text }}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Title>Yeni ürünler</Title>
      {data?.products.length ? <ProductGrid items={data.products} /> : <Empty text="Henüz ürün yok" />}
    </Screen>
  )
}
