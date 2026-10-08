import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, radius, space } from '@/lib/theme'

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 46,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: space(3),
            paddingVertical: props.multiline ? space(3) : 0,
            fontSize: 15,
            color: colors.text,
            backgroundColor: '#fff',
          },
          props.style,
        ]}
      />
      {error ? <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text> : null}
    </View>
  )
}

export function FormError({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space(3) }}>
      <Text style={{ color: colors.danger, fontSize: 14 }}>{text}</Text>
    </View>
  )
}
