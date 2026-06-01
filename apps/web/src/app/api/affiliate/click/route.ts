import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const refCode = String(body.ref_code ?? '').trim()
    if (!refCode || !/^[a-zA-Z0-9_-]{3,32}$/.test(refCode)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = await createClient()

    // ref_code valid mi?
    const { data: inf } = await (supabase as any)
      .from('influencers')
      .select('id')
      .eq('ref_code', refCode)
      .eq('status', 'approved')
      .maybeSingle()

    if (!inf) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    await (supabase as any).from('affiliate_clicks').insert({
      influencer_id: inf.id,
      ref_code: refCode,
      visitor_id: body.visitor_id ?? null,
      landing_url: body.landing_url ?? null,
      user_agent: body.user_agent ?? null,
      referer: body.referer ?? null,
    })

    // total_clicks counter — influencer_stats view'ı zaten clicks_count'u hesaplıyor,
    // ama hızlı erişim için satır üzerindeki sayacı da artıralım (best-effort)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
