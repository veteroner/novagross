import { signToken } from './signed-token'
export async function marketingDelivery(db: any, email: string, template: string): Promise<{ allowed: boolean; unsubscribeUrl?: string }> {
  if (!template.startsWith('marketing/')) return { allowed: true }
  // Newsletter permission does not include behavioral targeting, cart reminders or review requests.
  if (!['marketing/welcome-series', 'marketing/newsletter', 'marketing/campaign'].includes(template)) return { allowed: false }
  const address = email.trim().toLowerCase()
  const { data: prefs, error } = await db.from('email_preferences').select('marketing, newsletters, unsubscribed_all').eq('email', address)
  if (error || !prefs?.length || prefs.some((row: any) => row.unsubscribed_all) || !prefs.some((row: any) => row.marketing && row.newsletters)) return { allowed: false }
  const { data: proof, error: proofError } = await db.from('user_agreements').select('metadata').eq('agreement_type', 'acik_riza').contains('metadata', { email: address, channel: 'email', scope: 'newsletter' }).order('accepted_at', { ascending: false }).limit(1).maybeSingle()
  if (proofError || proof?.metadata?.state !== 'granted') return { allowed: false }
  const token = signToken('newsletter-unsubscribe', { email: address }, 365 * 86400)
  return { allowed: true, unsubscribeUrl: `https://novagross.com/bulten/ayril?token=${encodeURIComponent(token)}` }
}
export function unsubscribeFooter(url: string) {
  return `<p style="font-size:12px;color:#555;margin-top:24px">Bu e-postayı bülten izniniz kapsamında aldınız. <a href="${url}">Pazarlama e-postalarından çık</a>.</p>`
}
