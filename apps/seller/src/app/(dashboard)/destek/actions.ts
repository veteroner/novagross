'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { requireSeller } from '@/lib/auth/requireSeller'
import { createServiceRoleClient } from '@/lib/supabase/service'

async function assertOwnTicket(db: any, ticketId: string, storeId: string) {
  const { data: ticket } = await db
    .from('support_tickets')
    .select('id, ticket_no, store_id, source, user_id, customer_email, customer_name, subject')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) throw new Error('Talep bulunamadı.')
  const isOwn = ticket.store_id === storeId
  if (!isOwn) throw new Error('Bu talebe erişiminiz yok.')
  return ticket
}

export async function getTicketMessages(ticketId: string) {
  const { storeId } = await requireSeller('/destek')
  const db = createServiceRoleClient()
  await assertOwnTicket(db, ticketId, storeId)
  const { data } = await (db as any)
    .from('support_messages')
    .select('id, role, sender_name, content, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  return (data || []) as Array<{ id: string; role: string; sender_name: string | null; content: string; created_at: string }>
}

export async function replyToTicket(ticketId: string, message: string) {
  const { storeId, storeName } = await requireSeller('/destek')
  const text = message.trim()
  if (!text) throw new Error('Mesaj boş olamaz.')

  const db = createServiceRoleClient()
  const ticket = await assertOwnTicket(db, ticketId, storeId)

  await (db as any).from('support_messages').insert({
    ticket_id: ticketId,
    role: 'agent',
    sender_name: storeName || 'Satıcı',
    content: text,
  })
  await (db as any)
    .from('support_tickets')
    .update({ status: 'waiting_customer', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  // Müşteri talebiyse müşteriye e-posta gönder
  if (ticket.source === 'customer' && ticket.customer_email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = `${process.env.RESEND_FROM_NAME || 'Novagross'} <${process.env.RESEND_FROM_EMAIL || 'bildirim@novagross.com'}>`
    await resend.emails
      .send({
        from,
        to: ticket.customer_email,
        subject: `Talebiniz hakkında · ${ticket.ticket_no}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#16A34A">Satıcı Yanıtı · ${ticket.ticket_no}</h2>
          <p>Merhaba ${ticket.customer_name || ''},</p>
          <p><strong>${storeName}</strong> mağazasından yanıt:</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:12px;white-space:pre-wrap">${text}</div>
          <p style="color:#999;font-size:12px;margin-top:16px">Novagross</p>
        </div>`,
      })
      .catch(() => {})
  }

  revalidatePath('/destek')
}
