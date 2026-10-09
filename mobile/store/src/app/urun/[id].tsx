import { useState } from 'react'
import { Alert, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useProduct, useProductReviews } from '@/lib/catalog'
import { WEB_URL } from '@/lib/api'
import { useCartActions, useWishlist } from '@/lib/cart'
import { useAuth } from '@/providers/auth'
import { Price } from '@/components/product'
import { Button, Card, Empty, Loading, Muted, Title } from '@/components/ui'
import { fmtTRY } from '@/lib/format'
import { colors, space } from '@/lib/theme'

// Açıklama web'de HTML; burada düz metne indirgenir
const stripHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const { data: p, isLoading } = useProduct(id)
  const { data: reviews } = useProductReviews(id)
  const { add } = useCartActions()
  const wishlist = useWishlist()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [page, setPage] = useState(0)

  if (isLoading) return <Loading />
  if (!p) return <Empty text="Ürün bulunamadı veya yayında değil" />

  const fav = wishlist.ids.has(p.id)
  const requireLogin = () => {
    router.push('/giris')
    return false
  }

  const addToCart = () => {
    if (!session) return requireLogin()
    add.mutate(
      { productId: p.id },
      {
        onSuccess: () =>
          Alert.alert('Sepete eklendi', p.name, [
            { text: 'Alışverişe devam', style: 'cancel' },
            { text: 'Sepete git', onPress: () => router.push('/sepet') },
          ]),
        onError: (e: any) => Alert.alert('Eklenemedi', e.message),
      }
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: space(4) }}>
            <Pressable
              hitSlop={10}
              accessibilityLabel="Paylaş"
              onPress={() => Share.share({ message: `${p.name} — ${WEB_URL}/urun/${p.slug}` })}
            >
              <Ionicons name="share-outline" size={24} color={colors.primary} />
            </Pressable>
            <Pressable
              hitSlop={10}
              accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              onPress={() => (session ? wishlist.toggle(p.id).catch((e) => Alert.alert('Hata', e.message)) : requireLogin())}
            >
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={colors.primary} />
            </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: space(6) }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {(p.images.length ? p.images : [null]).map((url, i) => (
            <Image key={i} source={url ?? undefined} style={{ width, height: Math.min(width, 560), backgroundColor: '#fff' }} contentFit="contain" />
          ))}
        </ScrollView>
        {p.images.length > 1 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: space(2) }}>
            {p.images.map((_, i) => (
              <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === page ? colors.primary : colors.border }} />
            ))}
          </View>
        ) : null}

        <View style={{ padding: space(4), gap: space(3) }}>
          {p.brand ? <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryDark }}>{p.brand}</Text> : null}
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{p.name}</Text>
          <Price price={p.price} compareAt={p.compare_at_price} size={22} />

          {p.store ? (
            <Card>
              <Muted>Satıcı</Muted>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{p.store.store_name}</Text>
              {p.store.free_shipping_threshold != null ? (
                <Muted>
                  {Number(p.store.free_shipping_threshold) === 0
                    ? 'Kargo bedava'
                    : `${fmtTRY(p.store.free_shipping_threshold)} ve üzeri kargo bedava`}
                </Muted>
              ) : null}
            </Card>
          ) : null}

          {reviews?.length ? (
            <Card>
              <Title>
                Değerlendirmeler · {(reviews.reduce((t, r) => t + r.rating, 0) / reviews.length).toFixed(1)} ★ ({reviews.length})
              </Title>
              {reviews.slice(0, 5).map((r) => (
                <View key={r.id} style={{ gap: 2, paddingTop: space(2), borderTopWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.warning, fontWeight: '700' }}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(Math.max(0, 5 - r.rating))}
                  </Text>
                  {r.title ? <Text style={{ fontWeight: '600', color: colors.text }}>{r.title}</Text> : null}
                  {r.comment ? <Text style={{ color: colors.text }}>{r.comment}</Text> : null}
                  {r.seller_reply && r.seller_reply_approved ? <Muted>Satıcı yanıtı: {r.seller_reply}</Muted> : null}
                </View>
              ))}
            </Card>
          ) : null}

          {p.description ? (
            <Card>
              <Title>Ürün açıklaması</Title>
              <Text style={{ fontSize: 14, lineHeight: 21, color: colors.text }}>{stripHtml(p.description)}</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
          paddingHorizontal: space(4),
          paddingTop: space(3),
          paddingBottom: Math.max(insets.bottom, space(3)),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Price price={p.price} size={18} />
          {p.stock > 0 && p.stock <= 5 ? <Text style={{ fontSize: 12, color: colors.warning }}>Son {p.stock} ürün</Text> : null}
        </View>
        <View style={{ flex: 1.4 }}>
          {p.stock > 0 ? (
            <Button title="Sepete ekle" onPress={addToCart} loading={add.isPending} />
          ) : (
            <Button title="Tükendi" onPress={() => {}} disabled variant="outline" />
          )}
        </View>
      </View>
    </View>
  )
}
