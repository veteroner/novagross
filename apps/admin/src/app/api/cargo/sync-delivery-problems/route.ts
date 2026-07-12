import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG'den cevap bekleyen teslimat sorunlarını çekip delivery_problems'a yazar.
// Cron (MNG_CRON_SECRET) veya oturum açmış admin tarafından çağrılabilir.

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.MNG_CRON_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return profile?.role === 'admin' || profile?.role === 'super_admin'
  } catch {
    return false
  }
}

// MNG tarih biçimi: dd-MM-yyyy
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = mngKargo.isConfigured()
  if (!cfg.ok) {
    return NextResponse.json({ ok: false, error: `MNG eksik ayar: ${cfg.missing.join(', ')}` }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const days = Number(body?.days) || 14
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 3600_000)

  const service = createServiceRoleClient() as any
  const summary = { fetched: 0, inserted: 0, skipped: 0, errors: [] as string[] }

  try {
    const rows = await mngKargo.getShipmentDeliveryProblems({
      responseStartDate: fmt(start),
      responseEndDate: fmt(end),
      responseStatus: 0, // cevap bekleyenler
    })
    summary.fetched = rows.length

    for (const row of rows) {
      const mngShipmentId = String(row.shipmentId || row.shipmentID || '')
      const mngProblemId = Number(row.shipmentDeliveryProblemId || row.problemId || 0)
      if (!mngShipmentId || !mngProblemId) {
        summary.skipped++
        continue
      }

      // Zaten kayıtlıysa atla (unique constraint zaten korur ama önce kontrol edelim)
      const { data: existing } = await service
        .from('delivery_problems')
        .select('id')
        .eq('mng_shipment_id', mngShipmentId)
        .eq('mng_problem_id', mngProblemId)
        .maybeSingle()
      if (existing) {
        summary.skipped++
        continue
      }

      const referenceId = String(row.referenceId || '').trim().toUpperCase()
      let orderId: string | null = null
      let shipmentId: string | null = null
      if (referenceId) {
        const { data: shipment } = await service
          .from('order_shipments')
          .select('id, order_id')
          .eq('tracking_number', referenceId)
          .maybeSingle()
        if (shipment) {
          shipmentId = shipment.id
          orderId = shipment.order_id
        }
      }

      const { error } = await service.from('delivery_problems').insert({
        order_id: orderId,
        order_shipment_id: shipmentId,
        mng_shipment_id: mngShipmentId,
        mng_problem_id: mngProblemId,
        reference_id: referenceId || null,
        problem_description: row.description || row.problemDescription || null,
        raw_data: row,
      })

      if (error) {
        summary.errors.push(`${mngShipmentId}/${mngProblemId}: ${error.message}`)
      } else {
        summary.inserted++
      }
    }

    return NextResponse.json({ ok: true, summary })
  } catch (e: any) {
    console.error('[sync-delivery-problems] error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Hata', summary }, { status: 500 })
  }
}
