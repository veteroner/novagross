import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { csrfProtection } from '@/lib/csrf'
import { MARKETING_TEXT, MARKETING_VERSION } from '@/lib/privacy/marketing'

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  try {
    const body = await request.json()
    const db = createServiceRoleClient() as any
    const { data: profile, error: profileReadError } = await db.from('profiles').select('metadata').eq('id', user.id).single()
    if (profileReadError) throw profileReadError
    const metadata = { ...(profile?.metadata || {}) }
    const allowed = ['newsletter_subscribed', 'email_notifications', 'sms_notifications', 'push_notifications', 'personalized_offers']
    for (const key of allowed) { if (typeof body[key] !== 'boolean') return NextResponse.json({ error: 'Geçersiz tercih' }, { status: 400 }); metadata[key] = body[key] }
    metadata.locale = ['tr', 'en', 'de', 'fr'].includes(body.locale) ? body.locale : 'tr'
    metadata.currency = ['TRY', 'USD', 'EUR', 'GBP'].includes(body.currency) ? body.currency : 'TRY'
    const enabled = body.newsletter_subscribed === true
    if (enabled && !user.email_confirmed_at) return NextResponse.json({ error: 'Önce e-posta adresinizi doğrulayın.' }, { status: 400 })
    const { error: preferenceError } = await db.rpc('set_newsletter_preference', { p_email: user.email, p_enabled: enabled, p_user_id: user.id, p_source: 'account_settings', p_version: MARKETING_VERSION, p_text: MARKETING_TEXT })
    if (preferenceError) throw preferenceError
    const { error } = await db.from('profiles').update({ metadata, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Tercihler kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 }) }
}
