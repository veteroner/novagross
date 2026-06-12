import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AGREEMENT_VERSION, AGREEMENT_META } from '@/lib/agreements/registry'
import type { AgreementType } from '@/lib/agreements/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sözleşme kabul kaydını oluşturur. Body: { agreements: AgreementType[], order_id?, store_application_id? }
// Yasal kanıt için IP + user-agent saklanır.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const list: AgreementType[] = Array.isArray(body?.agreements) ? body.agreements : []
  const valid = list.filter((t) => AGREEMENT_META[t])
  if (valid.length === 0) {
    return NextResponse.json({ error: 'Geçersiz sözleşme listesi' }, { status: 400 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  const ua = req.headers.get('user-agent') ?? null

  const rows = valid.map((t) => ({
    user_id: user.id,
    agreement_type: t,
    version: AGREEMENT_VERSION,
    ip_address: ip,
    user_agent: ua,
    order_id: typeof body?.order_id === 'string' ? body.order_id : null,
    store_application_id:
      typeof body?.store_application_id === 'string' ? body.store_application_id : null,
  }))

  const { error } = await (supabase as any).from('user_agreements').insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: rows.length, version: AGREEMENT_VERSION })
}
