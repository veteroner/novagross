import { Resend } from 'resend'

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || 'bilgi@teknovagroup.com'
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com'
const SELLER_URL = process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'

type TicketLike = {
  ticket_no: string
  source: string
  category: string
  priority: string
  subject: string | null
  summary: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  store_name?: string | null
}

function resend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}
function from() {
  return `${process.env.RESEND_FROM_NAME || 'Novagross Destek'} <${process.env.RESEND_FROM_EMAIL || 'bildirim@novagross.com'}>`
}

function ticketHtml(t: TicketLike, transcript: string, forWhom: 'admin' | 'seller') {
  const panel = forWhom === 'admin' ? `${ADMIN_URL}/destek-talepleri` : `${SELLER_URL}/destek`
  return `
  <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#FF6000">Yeni Destek Talebi · ${t.ticket_no}</h2>
    <table style="font-size:14px;border-collapse:collapse">
      <tr><td style="color:#666;padding:2px 8px">Kaynak</td><td>${t.source === 'seller' ? 'Satıcı' : 'Müşteri'}</td></tr>
      <tr><td style="color:#666;padding:2px 8px">Konu</td><td>${t.subject || '-'}</td></tr>
      <tr><td style="color:#666;padding:2px 8px">Kategori</td><td>${t.category}</td></tr>
      <tr><td style="color:#666;padding:2px 8px">Öncelik</td><td>${t.priority}</td></tr>
      ${t.store_name ? `<tr><td style="color:#666;padding:2px 8px">Mağaza</td><td>${t.store_name}</td></tr>` : ''}
      <tr><td style="color:#666;padding:2px 8px">İlgili kişi</td><td>${t.customer_name || '-'} ${t.customer_email ? `· ${t.customer_email}` : ''} ${t.customer_phone ? `· ${t.customer_phone}` : ''}</td></tr>
    </table>
    <p style="font-size:14px"><strong>Özet:</strong> ${t.summary || '-'}</p>
    <div style="background:#f8f8f8;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap">${transcript}</div>
    <p style="margin-top:16px"><a href="${panel}" style="background:#FF6000;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Panelde Görüntüle</a></p>
  </div>`
}

export async function sendTicketNotifications(opts: {
  ticket: TicketLike
  routeTo: 'admin' | 'seller' | 'both'
  sellerEmail?: string | null
  transcript: string
}) {
  const client = resend()
  if (!client) return

  const jobs: Promise<any>[] = []

  if (opts.routeTo === 'admin' || opts.routeTo === 'both') {
    jobs.push(
      client.emails.send({
        from: from(),
        to: ADMIN_EMAIL,
        subject: `[${opts.ticket.priority.toUpperCase()}] Destek Talebi ${opts.ticket.ticket_no} · ${opts.ticket.subject || ''}`,
        html: ticketHtml(opts.ticket, opts.transcript, 'admin'),
      })
    )
  }
  if ((opts.routeTo === 'seller' || opts.routeTo === 'both') && opts.sellerEmail) {
    jobs.push(
      client.emails.send({
        from: from(),
        to: opts.sellerEmail,
        subject: `Yeni Müşteri Talebi ${opts.ticket.ticket_no} · ${opts.ticket.subject || ''}`,
        html: ticketHtml(opts.ticket, opts.transcript, 'seller'),
      })
    )
  }

  const results = await Promise.allSettled(jobs)
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[support notify] email ${i} failed:`, r.reason)
    } else if (r.value?.error) {
      console.error(`[support notify] email ${i} resend error:`, JSON.stringify(r.value.error))
    } else {
      console.log(`[support notify] email ${i} sent:`, r.value?.data?.id)
    }
  })
}

export async function sendCustomerAck(ticket: TicketLike) {
  const client = resend()
  if (!client || !ticket.customer_email) return
  await client.emails
    .send({
      from: from(),
      to: ticket.customer_email,
      subject: `Talebiniz alındı · ${ticket.ticket_no}`,
      html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#FF6000">Talebiniz Alındı</h2>
        <p>Merhaba ${ticket.customer_name || ''},</p>
        <p>Talebiniz <strong>${ticket.ticket_no}</strong> numarasıyla kaydedildi ve ilgili ekibimize/satıcımıza iletildi. En kısa sürede sizinle iletişime geçeceğiz.</p>
        <p style="color:#666;font-size:13px">Konu: ${ticket.subject || '-'}</p>
        <p style="color:#999;font-size:12px">Novagross Müşteri Hizmetleri</p>
      </div>`,
    })
    .catch(() => {})
}
