import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Satıcı, kendi siparişine ait MNG teslimat sorununu onaylar/reddeder.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

    const { problemId, approve, answer } = await req.json()
    if (!problemId || typeof approve !== 'boolean' || !answer || String(answer).trim().length < 3) {
      return NextResponse.json({ error: 'problemId, approve ve en az 3 karakterlik answer zorunlu' }, { status: 400 })
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', ((await (supabase as any).rpc('get_my_store')).data?.[0]?.store_id) ?? '')
      .maybeSingle()
    if (!store?.id) return NextResponse.json({ error: 'Mağazanız bulunamadı' }, { status: 403 })

    const service = createServiceRoleClient() as any
    const { data: problem } = await service
      .from('delivery_problems')
      .select('id, order_id, mng_shipment_id, mng_problem_id, status')
      .eq('id', problemId)
      .maybeSingle()

    if (!problem) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    if (problem.status !== 'pending') {
      return NextResponse.json({ error: 'Bu sorun zaten yanıtlanmış' }, { status: 400 })
    }

    const { data: ownItem } = await service
      .from('order_items')
      .select('id')
      .eq('order_id', problem.order_id)
      .eq('store_id', store.id)
      .limit(1)
      .maybeSingle()
    if (!ownItem) return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })

    const result = await mngKargo.answerShipmentDeliveryProblem({
      shipmentId: problem.mng_shipment_id,
      shipmentDeliveryProblemId: problem.mng_problem_id,
      approve,
      answer: String(answer),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'MNG yanıtı reddetti' }, { status: 502 })
    }

    const { error: updErr } = await service
      .from('delivery_problems')
      .update({
        status: approve ? 'approved' : 'rejected',
        admin_answer: String(answer),
        answered_by: user.id,
        answered_at: new Date().toISOString(),
      })
      .eq('id', problemId)
    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[seller answer-delivery-problem] error', e)
    return NextResponse.json({ error: e?.message || 'Hata' }, { status: 500 })
  }
}
