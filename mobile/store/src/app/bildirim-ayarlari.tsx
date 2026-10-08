import { Switch, Text, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { supabase } from '@/lib/supabase'
import { Card, Muted, Screen } from '@/components/ui'
import { colors, space } from '@/lib/theme'

// Kategoriler supabase notify(..., 'store', ...) çağrılarıyla aynı.
// 'order' işlemsel → kapatılamaz. 'marketing' satır yoksa KAPALI (açık rıza; değişiklikler
// marketing_consent_log'a trigger ile yazılır).
const CATEGORIES = [
  { key: 'order', label: 'Siparişler', desc: 'Ödeme, iptal, fatura, iade durumu', locked: true },
  { key: 'shipping', label: 'Kargo', desc: 'Kargoya verildi, dağıtımda, teslim edildi' },
  { key: 'qa', label: 'Soru-cevap', desc: 'Sorularınız yanıtlandığında' },
  { key: 'support', label: 'Destek', desc: 'Destek talebi yanıtları' },
  { key: 'marketing', label: 'Kampanya ve fırsatlar', desc: 'Size özel indirim ve kuponlar (ticari elektronik ileti)' },
] as const

export default function NotificationSettings() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const uid = session!.user.id

  const { data: prefs = {} } = useQuery({
    queryKey: ['prefs', uid],
    queryFn: async () => {
      const { data } = await (supabase as any).from('notification_preferences').select('category, enabled').eq('app', 'store')
      return Object.fromEntries((data ?? []).map((r: any) => [r.category, r.enabled])) as Record<string, boolean>
    },
  })

  const toggle = async (category: string, enabled: boolean) => {
    qc.setQueryData(['prefs', uid], { ...prefs, [category]: enabled })
    await (supabase as any)
      .from('notification_preferences')
      .upsert({ user_id: uid, app: 'store', category, enabled, updated_at: new Date().toISOString() })
    qc.invalidateQueries({ queryKey: ['prefs', uid] })
  }

  return (
    <Screen>
      <Muted>Kapattığınız kategoriler uygulama içi bildirim listesinde görünmeye devam eder, yalnızca anlık bildirim gelmez.</Muted>
      <Card style={{ gap: space(4) }}>
        {CATEGORIES.map((c) => {
          const locked = 'locked' in c && c.locked
          const value = locked ? true : (prefs[c.key] ?? c.key !== 'marketing')
          return (
            <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{c.label}</Text>
                <Muted>{locked ? `${c.desc} — kapatılamaz` : c.desc}</Muted>
              </View>
              <Switch value={value} disabled={locked} onValueChange={(v) => toggle(c.key, v)} trackColor={{ true: colors.primary }} />
            </View>
          )
        })}
      </Card>
      <Muted>
        Kampanya bildirimlerine onay verirseniz Novagross size ticari elektronik ileti gönderebilir. Onayınızı istediğiniz zaman bu ekrandan geri
        alabilirsiniz.
      </Muted>
    </Screen>
  )
}
