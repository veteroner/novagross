import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { runSupportEngine, type ChatMsg } from '@/lib/support/engine'
import { sendTicketNotifications, sendCustomerAck } from '@/lib/support/notify'

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
    const orderNumber: string | null = body?.orderNumber || null
    const contact = body?.contact || {}

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let customerName = contact.name || null
    let customerEmail = contact.email || null
    if (user) {
      customerEmail = customerEmail || user.email || null
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle()
      if (profile && !customerName) {
        customerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
      }
    }

    // AI yanıtı + triyaj
    const result = await runSupportEngine(messages, {
      source: 'customer',
      userName: customerName,
      orderNumber,
    })

    const db = createServiceRoleClient()

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
          source: 'customer',
          user_id: user?.id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: contact.phone || null,
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

    // Mesajları kaydet (son kullanıcı mesajı + AI yanıtı)
    const lastUser = messages[messages.length - 1]
    await (db as any).from('support_messages').insert([
      { ticket_id: ticket.id, role: 'user', sender_name: customerName, content: lastUser.content },
      { ticket_id: ticket.id, role: 'assistant', content: result.reply },
    ])
    await (db as any)
      .from('support_tickets')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', ticket.id)

    // Escalation: ilk kez yönlendir + e-posta
    const alreadyEscalated = ticket.route_to === 'both' || ticket.status === 'in_progress'
    if (result.escalate && !alreadyEscalated) {
      let routeTo: 'admin' | 'both' = 'admin'
      let storeId: string | null = ticket.store_id || null
      let sellerEmail: string | null = null
      let storeName: string | null = null

      // Satıcıya yönlendirme: sipariş no'dan mağaza(lar)ı çöz
      if (result.needs_seller && orderNumber) {
        const { data: order } = await (db as any)
          .from('orders')
          .select('id')
          .eq('order_number', orderNumber)
          .maybeSingle()
        if (order) {
          const { data: items } = await (db as any)
            .from('order_items')
            .select('store_id')
            .eq('order_id', order.id)
          const storeIds = Array.from(new Set((items || []).map((i: any) => i.store_id).filter(Boolean)))
          if (storeIds.length > 0) {
            storeId = storeIds[0] as string
            const { data: store } = await (db as any)
              .from('stores')
              .select('store_name, email, owner_id')
              .eq('id', storeId)
              .maybeSingle()
            storeName = store?.store_name || null
            sellerEmail = store?.email || null
            if (!sellerEmail && store?.owner_id) {
              const { data: owner } = await (db as any).from('profiles').select('email').eq('id', store.owner_id).maybeSingle()
              sellerEmail = owner?.email || null
            }
            routeTo = 'both'
            await (db as any).from('support_tickets').update({ order_id: order.id, store_id: storeId }).eq('id', ticket.id)
          }
        }
      }

      await (db as any)
        .from('support_tickets')
        .update({ route_to: routeTo, status: 'in_progress', category: result.category, priority: result.priority, subject: result.subject, summary: result.summary })
        .eq('id', ticket.id)

      const transcript = messages.map((m) => `${m.role === 'user' ? 'Müşteri' : 'AI'}: ${m.content}`).join('\n') + `\nAI: ${result.reply}`
      const ticketForMail = { ...ticket, category: result.category, priority: result.priority, subject: result.subject, summary: result.summary, store_name: storeName }

      await sendTicketNotifications({ ticket: ticketForMail, routeTo, sellerEmail, transcript })
      await sendCustomerAck(ticketForMail)
    }

    return NextResponse.json({
      reply: result.reply,
      ticketId: ticket.id,
      ticketNo: ticket.ticket_no,
      escalated: result.escalate,
    })
  } catch (e) {
    console.error('[support chat] error', e)
    return NextResponse.json({ reply: 'Şu an bir sorun oluştu, lütfen biraz sonra tekrar deneyin.', error: true }, { status: 200 })
  }
}
