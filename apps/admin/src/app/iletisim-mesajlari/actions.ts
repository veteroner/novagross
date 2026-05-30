'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export type MessageStatus = 'new' | 'read' | 'replied' | 'archived'

const VALID_STATUSES: MessageStatus[] = ['new', 'read', 'replied', 'archived']

export async function updateMessageStatus(id: string, status: MessageStatus) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error('Geçersiz durum.')
  }
  const { supabase } = await requireAdmin('/iletisim-mesajlari')
  const { error } = await supabase
    .from('contact_messages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/iletisim-mesajlari')
}

export async function updateMessageNotes(id: string, notes: string) {
  const { supabase } = await requireAdmin('/iletisim-mesajlari')
  const { error } = await supabase
    .from('contact_messages')
    .update({
      admin_notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/iletisim-mesajlari')
}

export async function deleteMessage(id: string) {
  const { supabase } = await requireAdmin('/iletisim-mesajlari')
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/iletisim-mesajlari')
}
