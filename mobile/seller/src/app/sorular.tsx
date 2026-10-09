import { useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { supabase } from '@/lib/supabase'
import { Badge, Button, Card, Empty, Loading, Muted, Screen } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { colors, radius, space } from '@/lib/theme'

// Web satıcı paneli /sorular ve /yorumlar ile aynı: yanıt admin onayına düşer
// (answer_status='pending' / seller_reply_approved=null). RLS: is_store_member.

function ReplyBox({ initial, onSend }: { initial?: string | null; onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  return (
    <View style={{ gap: space(2) }}>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Yanıtınız"
        placeholderTextColor={colors.muted}
        style={{ minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space(3), backgroundColor: '#fff' }}
      />
      <Button
        title={initial ? 'Yanıtı güncelle' : 'Yanıtla'}
        loading={busy}
        disabled={text.trim().length < 3}
        onPress={async () => {
          setBusy(true)
          try {
            await onSend(text.trim())
          } catch (e: any) {
            Alert.alert('Gönderilemedi', e.message)
          } finally {
            setBusy(false)
          }
        }}
      />
    </View>
  )
}

export default function QA() {
  const { store, session } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'q' | 'r'>('q')

  const q = useQuery({
    queryKey: ['questions', store?.storeId],
    enabled: !!store?.storeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('product_questions')
        .select('id, question, answer, answer_status, created_at, products!inner(name, store_id)')
        .eq('products.store_id', store!.storeId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as any[]
    },
  })
  const r = useQuery({
    queryKey: ['reviews', store?.storeId],
    enabled: !!store?.storeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('reviews')
        .select('id, rating, title, comment, seller_reply, seller_reply_approved, created_at, products!inner(name, store_id)')
        .eq('products.store_id', store!.storeId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as any[]
    },
  })

  const answer = async (id: string, text: string) => {
    const { error } = await (supabase as any)
      .from('product_questions')
      .update({ answer: text, answered_by: session!.user.id, answered_at: new Date().toISOString(), answer_status: 'pending' })
      .eq('id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['questions'] })
    Alert.alert('Gönderildi', 'Yanıtınız onaydan sonra üründe yayınlanır.')
  }
  const reply = async (id: string, text: string) => {
    const { error } = await (supabase as any)
      .from('reviews')
      .update({ seller_reply: text, seller_reply_at: new Date().toISOString(), seller_reply_approved: null })
      .eq('id', id)
    if (error) throw error
    qc.invalidateQueries({ queryKey: ['reviews'] })
    Alert.alert('Gönderildi', 'Yanıtınız onaydan sonra yorumun altında yayınlanır.')
  }

  const Tab = ({ k, label, n }: { k: 'q' | 'r'; label: string; n: number }) => (
    <Pressable
      onPress={() => setTab(k)}
      style={{ flex: 1, paddingVertical: space(2), borderRadius: radius.md, backgroundColor: tab === k ? colors.primary : '#fff', alignItems: 'center' }}
    >
      <Text style={{ fontWeight: '600', color: tab === k ? '#fff' : colors.text }}>
        {label}
        {n ? ` (${n})` : ''}
      </Text>
    </Pressable>
  )

  const openQ = (q.data ?? []).filter((x) => !x.answer).length
  const openR = (r.data ?? []).filter((x) => !x.seller_reply).length
  const active = tab === 'q' ? q : r

  return (
    <Screen refreshing={active.isRefetching} onRefresh={active.refetch}>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <Tab k="q" label="Sorular" n={openQ} />
        <Tab k="r" label="Yorumlar" n={openR} />
      </View>
      {active.isLoading ? <Loading /> : null}

      {tab === 'q'
        ? (q.data ?? []).length === 0 && !q.isLoading
          ? <Empty text="Ürünlerinize soru sorulmamış" />
          : (q.data ?? []).map((x) => (
              <Card key={x.id}>
                <Muted>
                  {x.products?.name} · {fmtDate(x.created_at)}
                </Muted>
                <Text style={{ fontWeight: '600' }}>{x.question}</Text>
                {x.answer ? (
                  <Badge
                    label={x.answer_status === 'approved' ? 'Yanıt yayında' : x.answer_status === 'rejected' ? 'Yanıt reddedildi' : 'Yanıt onay bekliyor'}
                    tone={x.answer_status === 'approved' ? 'success' : x.answer_status === 'rejected' ? 'danger' : 'warning'}
                  />
                ) : null}
                <ReplyBox initial={x.answer} onSend={(t) => answer(x.id, t)} />
              </Card>
            ))
        : (r.data ?? []).length === 0 && !r.isLoading
          ? <Empty text="Henüz yorum yok" />
          : (r.data ?? []).map((x) => (
              <Card key={x.id}>
                <Muted>
                  {x.products?.name} · {fmtDate(x.created_at)}
                </Muted>
                <Text style={{ fontWeight: '700', color: colors.warning }}>
                  {'★'.repeat(x.rating)}
                  {'☆'.repeat(Math.max(0, 5 - x.rating))}
                </Text>
                {x.title ? <Text style={{ fontWeight: '600' }}>{x.title}</Text> : null}
                {x.comment ? <Text>{x.comment}</Text> : null}
                {x.seller_reply ? (
                  <Badge
                    label={x.seller_reply_approved === true ? 'Yanıt yayında' : x.seller_reply_approved === false ? 'Yanıt reddedildi' : 'Yanıt onay bekliyor'}
                    tone={x.seller_reply_approved === true ? 'success' : x.seller_reply_approved === false ? 'danger' : 'warning'}
                  />
                ) : null}
                <ReplyBox initial={x.seller_reply} onSend={(t) => reply(x.id, t)} />
              </Card>
            ))}
    </Screen>
  )
}
