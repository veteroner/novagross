'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type DocType =
  | 'tax_certificate'
  | 'id_card'
  | 'contract'
  | 'signature_circular'
  | 'trade_registry'
  | 'other'

const VALID: DocType[] = [
  'tax_certificate',
  'id_card',
  'contract',
  'signature_circular',
  'trade_registry',
  'other',
]

export async function createDocument(input: {
  doc_type: DocType
  title: string
  file_url: string
  file_size_bytes?: number
  mime_type?: string
  expires_at?: string | null
}) {
  if (!VALID.includes(input.doc_type)) throw new Error('Geçersiz belge tipi.')
  if (!input.title?.trim()) throw new Error('Başlık gerekli.')
  if (!input.file_url?.trim()) throw new Error('Dosya gerekli.')

  const { supabase, storeId, userId } = await requireSeller('/belgeler')

  const { error } = await (supabase as any).from('store_documents').insert({
    store_id: storeId,
    doc_type: input.doc_type,
    title: input.title.trim(),
    file_url: input.file_url.trim(),
    file_size_bytes: input.file_size_bytes ?? null,
    mime_type: input.mime_type ?? null,
    expires_at: input.expires_at || null,
    uploaded_by: userId,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/belgeler')
}

export async function deleteDocument(id: string) {
  const { supabase } = await requireSeller('/belgeler')
  // Yalnızca pending belgeler silinebilir
  const { error } = await (supabase as any)
    .from('store_documents')
    .delete()
    .eq('id', id)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  revalidatePath('/belgeler')
}
