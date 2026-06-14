'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function replyToTicket(ticketId: string, message: string) {
  const { userId } = await requireAdmin('/destek-talepleri')
  const text = message.trim()
  if (!text) throw new Error('Mesaj boş olamaz.')

  const db = createServiceRoleClient()
  const { data: ticket } = await (db as any)
    .from('support_tickets')
    .select('id, ticket_no, customer_email, customer_name, subject')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) throw new Error('Talep bulunamadı.')

  await (db as any).from('support_messages').insert({
    ticket_id: ticketId,
    role: 'agent',
    sender_name: 'Novagross Destek',
    content: text,
  })
  await (db as any)
    .from('support_tickets')
    .update({ status: 'waiting_customer', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  // Müşteriye e-posta
  if (ticket.customer_email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = `${process.env.RESEND_FROM_NAME || 'Novagross Destek'} <${process.env.RESEND_FROM_EMAIL || 'bildirim@novagross.com'}>`
    await resend.emails
      .send({
        from,
        to: ticket.customer_email,
        subject: `Destek talebiniz hakkında · ${ticket.ticket_no}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#FF6000">Destek Yanıtı · ${ticket.ticket_no}</h2>
          <p>Merhaba ${ticket.customer_name || ''},</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:12px;white-space:pre-wrap">${text}</div>
          <p style="color:#999;font-size:12px;margin-top:16px">Novagross Müşteri Hizmetleri</p>
        </div>`,
      })
      .catch(() => {})
  }

  revalidatePath('/destek-talepleri')
}

export async function getTicketMessages(ticketId: string) {
  await requireAdmin('/destek-talepleri')
  const db = createServiceRoleClient()
  const { data } = await (db as any)
    .from('support_messages')
    .select('id, role, sender_name, content, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  return (data || []) as Array<{ id: string; role: string; sender_name: string | null; content: string; created_at: string }>
}

export async function setTicketStatus(ticketId: string, status: string) {
  await requireAdmin('/destek-talepleri')
  const valid = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']
  if (!valid.includes(status)) throw new Error('Geçersiz durum.')
  const db = createServiceRoleClient()
  await (db as any)
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString(), ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}) })
    .eq('id', ticketId)
  revalidatePath('/destek-talepleri')
}
