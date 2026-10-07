import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { router, Stack } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { slugify, uploadProductImages, useCategories } from '@/lib/products'
import { supabase } from '@/lib/supabase'
import { Button, Card, Muted, Screen, Title } from '@/components/ui'
import { colors, radius, space } from '@/lib/theme'

const MAX_IMAGES = 6

export default function NewProduct() {
  const { store } = useAuth()
  const qc = useQueryClient()
  const { data: categories = [] } = useCategories()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [stock, setStock] = useState('1')
  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [catQuery, setCatQuery] = useState('')
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [saving, setSaving] = useState(false)

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) return Alert.alert('Kamera izni gerekli')
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: MAX_IMAGES - images.length,
          quality: 0.8,
        })
    if (res.canceled) return
    setImages((prev) => [...prev, ...res.assets].slice(0, MAX_IMAGES))
  }

  const submit = async () => {
    const priceN = Number(price.replace(',', '.'))
    const compareN = comparePrice ? Number(comparePrice.replace(',', '.')) : null
    const stockN = Number.parseInt(stock, 10)
    if (name.trim().length < 3) return Alert.alert('Ürün adı en az 3 karakter olmalı')
    if (!Number.isFinite(priceN) || priceN <= 0) return Alert.alert('Geçerli bir fiyat girin')
    if (compareN !== null && (!Number.isFinite(compareN) || compareN <= priceN))
      return Alert.alert('İndirimsiz fiyat satış fiyatından büyük olmalı')
    if (!Number.isInteger(stockN) || stockN < 0) return Alert.alert('Geçerli bir stok girin')
    if (!categoryId) return Alert.alert('Kategori seçin')
    if (images.length === 0) return Alert.alert('En az bir ürün fotoğrafı ekleyin')

    setSaving(true)
    try {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          store_id: store!.storeId,
          name: name.trim(),
          slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
          description: description.trim() || null,
          price: priceN,
          compare_at_price: compareN,
          stock: stockN,
          sku: sku.trim() || null,
          brand: brand.trim() || null,
          category_id: categoryId,
          is_active: true,
          // Trendyol/Hepsiburada gibi: admin onayından sonra yayına girer.
          // enforce_product_moderation trigger'ı bunu sunucuda da zorunlu tutar.
          approval_status: 'pending',
        } as any)
        .select('id')
        .single()
      if (error) throw error
      await uploadProductImages((product as any).id, images.map((i) => ({ uri: i.uri, mimeType: i.mimeType })))
      await qc.invalidateQueries({ queryKey: ['products'] })
      Alert.alert('Ürün onaya gönderildi', 'Admin onayından sonra mağazanızda yayınlanır; size bildirim gelir.')
      router.back()
    } catch (e: any) {
      Alert.alert('Ürün eklenemedi', e.message)
    } finally {
      setSaving(false)
    }
  }

  const catList = categories.filter((c) => c.name.toLowerCase().includes(catQuery.trim().toLowerCase())).slice(0, 30)
  const selectedCat = categories.find((c) => c.id === categoryId)

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Yeni ürün' }} />

      <Card style={{ gap: space(3) }}>
        <Title>Fotoğraflar</Title>
        <ScrollView horizontal contentContainerStyle={{ gap: space(2) }}>
          {images.map((img, i) => (
            <Pressable key={img.uri} onLongPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
              <Image source={img.uri} style={styles.thumb} contentFit="cover" />
              {i === 0 ? <Text style={styles.cover}>Kapak</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
        {images.length < MAX_IMAGES ? (
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <View style={{ flex: 1 }}>
              <Button title="Fotoğraf çek" variant="outline" onPress={() => pick(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Galeriden seç" variant="outline" onPress={() => pick(false)} />
            </View>
          </View>
        ) : null}
        <Muted>İlk fotoğraf kapak olur. Silmek için fotoğrafa basılı tutun. En fazla {MAX_IMAGES}.</Muted>
      </Card>

      <Card style={{ gap: space(2) }}>
        <Title>Bilgiler</Title>
        <Field label="Ürün adı *" value={name} onChangeText={setName} />
        <Field label="Açıklama" value={description} onChangeText={setDescription} multiline />
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Field label="Satış fiyatı (₺) *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="İndirimsiz fiyat" value={comparePrice} onChangeText={setComparePrice} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Field label="Stok *" value={stock} onChangeText={setStock} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Stok kodu (SKU)" value={sku} onChangeText={setSku} />
          </View>
        </View>
        <Field label="Marka" value={brand} onChangeText={setBrand} />
      </Card>

      <Card style={{ gap: space(2) }}>
        <Title>Kategori *</Title>
        {selectedCat ? <Text style={{ fontWeight: '600', color: colors.primary }}>✓ {selectedCat.name}</Text> : null}
        <TextInput style={styles.input} placeholder="Kategori ara" value={catQuery} onChangeText={setCatQuery} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {catList.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, c.id === categoryId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={{ color: c.id === categoryId ? '#fff' : colors.text }}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button title="Onaya gönder" onPress={submit} loading={saving} />
      <Muted style={{ textAlign: 'center' }}>Ürün admin onayından sonra yayınlanır.</Muted>
    </Screen>
  )
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...rest } = props
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{label}</Text>
      <TextInput {...rest} multiline={multiline} style={[styles.input, multiline && { height: 100, paddingTop: 10, textAlignVertical: 'top' }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    paddingHorizontal: space(3),
    fontSize: 16,
  },
  thumb: { width: 88, height: 88, borderRadius: radius.sm, backgroundColor: '#F3F4F6' },
  cover: { position: 'absolute', bottom: 4, left: 4, backgroundColor: colors.primary, color: '#fff', fontSize: 11, paddingHorizontal: 6, borderRadius: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
})
