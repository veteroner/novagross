import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { AGREEMENT_VERSION, AGREEMENT_META, type AgreementType } from '@/lib/agreements/registry'
import snapshots from '@/lib/agreements/document-snapshots.json'
import { csrfProtection } from '@/lib/csrf'
import { MARKETING_TEXT, MARKETING_VERSION } from '@/lib/privacy/marketing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const membership = ['uyelik_sozlesmesi', 'kvkk_aydinlatma'] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ missing: [] }, { headers: { 'Cache-Control': 'no-store' } })
  const { data, error } = await (supabase as any).from('user_agreements').select('agreement_type, metadata').eq('user_id', user.id).eq('version', AGREEMENT_VERSION).in('agreement_type', [...membership])
  if (error) return NextResponse.json({ error: 'Onay kayıtları alınamadı' }, { status: 503 })
  return NextResponse.json({ missing: membership.filter(type => !(data || []).some((row: any) => row.agreement_type === type && row.metadata?.document_hash === snapshots[type].hash)), version: AGREEMENT_VERSION }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const csrfError = csrfProtection(req)
  if (csrfError) return csrfError
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  try {
    const body = await req.json()
    if (body.version !== AGREEMENT_VERSION) return NextResponse.json({ error: 'Metinler güncellenmiş. Sayfayı yenileyip tekrar inceleyin.' }, { status: 409 })
    const list = Array.isArray(body.agreements) ? [...new Set(body.agreements)] : []
    if (!list.length || list.some(t => typeof t !== 'string' || !Object.prototype.hasOwnProperty.call(AGREEMENT_META, t) || t === 'mesafeli_satis' || t === 'on_bilgilendirme')) return NextResponse.json({ error: 'Geçersiz sözleşme listesi. Sipariş sözleşmeleri ödeme akışında kaydedilir.' }, { status: 400 })
    const db = createServiceRoleClient() as any
    if (body.store_application_id) {
      const { data } = await db.from('store_applications').select('id').eq('id', body.store_application_id).eq('user_id', user.id).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 403 })
    }
    if (list.includes('acik_riza') && !user.email_confirmed_at) return NextResponse.json({ error: 'Pazarlama izni için önce e-posta adresinizi doğrulayın.' }, { status: 400 })
    const rows = (list as AgreementType[]).map(type => {
      const snapshot = snapshots[type as keyof typeof snapshots]
      return { user_id: user.id, agreement_type: type, version: AGREEMENT_VERSION, user_agent: req.headers.get('user-agent'), store_application_id: body.store_application_id || null, metadata: { document_text: snapshot.text, document_hash: snapshot.hash, links: snapshot.links, source: 'explicit_web_consent', ...(type === 'acik_riza' ? { email: user.email, channel: 'email', scope: 'newsletter', text: MARKETING_TEXT, marketing_version: MARKETING_VERSION } : {}) } }
    })
    const { error } = await db.from('user_agreements').insert(rows)
    if (error) throw error
    if (list.includes('acik_riza')) {
      const { error } = await db.rpc('set_newsletter_preference', { p_email: user.email, p_enabled: true, p_user_id: user.id, p_source: 'membership', p_version: MARKETING_VERSION, p_text: MARKETING_TEXT })
      if (error) throw error
    }
    return NextResponse.json({ ok: true, count: rows.length, version: AGREEMENT_VERSION })
  } catch { return NextResponse.json({ error: 'Onay kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 503 }) }
}
