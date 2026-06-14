import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { runSupportEngine, type ChatMsg } from '@/lib/support/engine'
import { sendTicketNotifications } from '@/lib/support/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MESSAGES = 30
const MAX_LEN = 2000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawMessages: ChatMsg[] = Array.isArray(body?.messages) ? body.messages : []
    const messages = rawMessages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_LEN) }))

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    const ticketId: string | undefined = body?.ticketId

    // Satıcı oturumu + mağaza
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })

    const db = createServiceRoleClient()
    const { data: store } = await (db as any)
      .from('stores')
      .select('id, store_name, email')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!store) return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 403 })

    const result = await runSupportEngine(messages, { source: 'seller', storeName: store.store_name })

    // Ticket oluştur / yükle
    let ticket: any
    if (ticketId) {
      const { data } = await (db as any).from('support_tickets').select('*').eq('id', ticketId).maybeSingle()
      ticket = data
    }
    if (!ticket) {
      const { data: created } = await (db as any)
        .from('support_tickets')
        .insert({
          source: 'seller',
          user_id: user.id,
          customer_name: store.store_name,
          customer_email: store.email || user.email || null,
          store_id: store.id,
          category: result.category,
          subject: result.subject,
          summary: result.summary,
          priority: result.priority,
          status: 'open',
          route_to: 'admin',
        })
        .select('*')
        .single()
      ticket = created
    }
    if (!ticket) return NextResponse.json({ error: 'Ticket oluşturulamadı' }, { status: 500 })

    const lastUser = messages[messages.length - 1]
    await (db as any).from('support_messages').insert([
      { ticket_id: ticket.id, role: 'user', sender_name: store.store_name, content: lastUser.content },
      { ticket_id: ticket.id, role: 'assistant', content: result.reply },
    ])
    await (db as any)
      .from('support_tickets')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', ticket.id)

    // Satıcı talepleri her zaman admin'e iletilir
    const alreadyEscalated = ticket.status === 'in_progress'
    if (result.escalate && !alreadyEscalated) {
      await (db as any)
        .from('support_tickets')
        .update({ status: 'in_progress', category: result.category, priority: result.priority, subject: result.subject, summary: result.summary })
        .eq('id', ticket.id)

      const transcript = messages.map((m) => `${m.role === 'user' ? 'Satıcı' : 'AI'}: ${m.content}`).join('\n') + `\nAI: ${result.reply}`
      await sendTicketNotifications({
        ticket: { ...ticket, category: result.category, priority: result.priority, subject: result.subject, summary: result.summary, store_name: store.store_name },
        routeTo: 'admin',
        transcript,
      })
    }

    return NextResponse.json({ reply: result.reply, ticketId: ticket.id, ticketNo: ticket.ticket_no, escalated: result.escalate })
  } catch (e) {
    console.error('[seller support chat] error', e)
    return NextResponse.json({ reply: 'Şu an bir sorun oluştu, lütfen biraz sonra tekrar deneyin.', error: true }, { status: 200 })
  }
}
