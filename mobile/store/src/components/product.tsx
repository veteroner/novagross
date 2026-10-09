import { Pressable, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import type { ProductCard as Card } from '@/lib/catalog'
import { fmtTRY } from '@/lib/format'
import { colors, radius, space } from '@/lib/theme'

export function Price({ price, compareAt, size = 15 }: { price: number; compareAt?: number | null; size?: number }) {
  const discount = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
      <Text style={{ fontSize: size, fontWeight: '800', color: colors.primary }}>{fmtTRY(price)}</Text>
      {discount > 0 ? (
        <>
          <Text style={{ fontSize: size - 3, color: colors.muted, textDecorationLine: 'line-through' }}>{fmtTRY(compareAt!)}</Text>
          <Text style={{ fontSize: size - 3, color: colors.success, fontWeight: '700' }}>%{discount}</Text>
        </>
      ) : null}
    </View>
  )
}

export function ProductTile({ p, width }: { p: Card; width: number }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/urun/[id]', params: { id: p.id } })}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <Image source={p.image ?? undefined} style={{ width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6' }} contentFit="cover" />
        <View style={{ padding: space(2), gap: 4 }}>
          <Text numberOfLines={2} style={{ fontSize: 13, color: colors.text, minHeight: 34 }}>
            {p.name}
          </Text>
          <Price price={p.price} compareAt={p.compare_at_price} size={14} />
          {p.stock <= 0 ? <Text style={{ fontSize: 12, color: colors.danger }}>Tükendi</Text> : null}
        </View>
      </View>
    </Pressable>
  )
}

/** Ürün ızgarası (ScrollView içinde), ekran genişliğine göre 2–4 sütun */
export function ProductGrid({ items }: { items: Card[] }) {
  const { width } = useWindowDimensions()
  // Telefon 2, küçük tablet 3, büyük tablet 4 sütun
  const cols = width >= 900 ? 4 : width >= 600 ? 3 : 2
  const tile = Math.floor((width - space(4) * 2 - space(3) * (cols - 1)) / cols)
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
      {items.map((p) => (
        <ProductTile key={p.id} p={p} width={tile} />
      ))}
    </View>
  )
}
