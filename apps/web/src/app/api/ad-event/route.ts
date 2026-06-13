import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { campaign_id, product_id, event_type, session_id } = body

    if (!campaign_id || !event_type || !['impression', 'click', 'conversion'].includes(event_type)) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Impression dedup: aynı session+campaign için 30 dakikada bir
    if (event_type === 'impression' && session_id) {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('ad_events')
        .select('id')
        .eq('campaign_id', campaign_id)
        .eq('session_id', session_id)
        .eq('event_type', 'impression')
        .gte('created_at', cutoff)
        .limit(1)
        .maybeSingle()

      if (recent) return NextResponse.json({ skipped: true })
    }

    // Kampanya bilgisini al (bid_per_click, daily_budget, total_spent)
    const { data: campaign } = await supabase
      .from('ad_campaigns')
      .select('id, bid_per_click, daily_budget, total_spent, is_active')
      .eq('id', campaign_id)
      .maybeSingle()

    if (!campaign || !campaign.is_active) {
      return NextResponse.json({ skipped: true })
    }

    const cost = event_type === 'click' ? Number(campaign.bid_per_click ?? 0) : 0

    // Event logla
    await supabase.from('ad_events').insert({
      campaign_id,
      product_id: product_id ?? null,
      event_type,
      cost,
      session_id: session_id ?? null,
    })

    // Click ise harcamayı güncelle ve bütçe kontrolü yap
    if (event_type === 'click' && cost > 0) {
      const newTotalSpent = Number(campaign.total_spent ?? 0) + cost

      // Bugün harcanan miktar
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: todayEvents } = await supabase
        .from('ad_events')
        .select('cost')
        .eq('campaign_id', campaign_id)
        .eq('event_type', 'click')
        .gte('created_at', todayStart.toISOString())

      const todaySpent = (todayEvents ?? []).reduce((s: number, e: any) => s + Number(e.cost), 0) + cost
      const dailyBudget = Number(campaign.daily_budget ?? 0)

      const updatePayload: Record<string, any> = { total_spent: newTotalSpent }

      // Günlük bütçe aşıldıysa kampanyayı durdur
      if (dailyBudget > 0 && todaySpent >= dailyBudget) {
        updatePayload.is_active = false
      }

      await supabase.from('ad_campaigns').update(updatePayload).eq('id', campaign_id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
