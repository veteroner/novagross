import { requireAdmin } from '@/lib/auth/requireAdmin'
import { MessagesClient, type Message } from './messages-client'

export const dynamic = 'force-dynamic'

export default async function IletisimMesajlariPage() {
  const { supabase } = await requireAdmin('/iletisim-mesajlari')

  const { data, error } = await supabase
    .from('contact_messages')
    .select('id, name, email, phone, subject, message, status, admin_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[İletişim Mesajları] query failed:', error)
  }

  const messages = (data ?? []) as Message[]

  return <MessagesClient messages={messages} />
}
