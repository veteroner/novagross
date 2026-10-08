import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, radius, space } from '@/lib/theme'

const fold = (s: string) => s.toLocaleLowerCase('tr-TR').trim()

/** Listeden seçim (arama kutulu tam ekran liste) — il/ilçe gibi serbest metne bırakılmaması gereken alanlar */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seçin',
  disabled,
  error,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const insets = useSafeAreaInsets()
  const filtered = useMemo(() => (q ? options.filter((o) => fold(o).includes(fold(q))) : options), [q, options])

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => {
          setQ('')
          setOpen(true)
        }}
        style={{
          minHeight: 46,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space(3),
          backgroundColor: disabled ? '#F3F4F6' : '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 15, color: value ? colors.text : colors.muted }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: space(4), gap: space(3) }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Kapat</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: space(4), paddingBottom: space(2) }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Ara"
              autoFocus
              autoCorrect={false}
              placeholderTextColor={colors.muted}
              style={{ height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space(3), backgroundColor: '#fff', fontSize: 15 }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(o) => o}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item)
                  setOpen(false)
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: space(4),
                  paddingVertical: space(3),
                  backgroundColor: pressed ? colors.primarySoft : 'transparent',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                })}
              >
                <Text style={{ fontSize: 15, color: colors.text }}>{item}</Text>
                {item === value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  )
}
