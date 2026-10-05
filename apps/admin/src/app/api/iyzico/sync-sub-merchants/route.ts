import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { syncStoreSubMerchants } from '@/lib/iyzico/sub-merchant-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// pg_cron (10 dk'da bir): bilgileri değişen mağazaları (stores.iyzico_sync_needed,
// trigger ile işaretlenir) iyzico alt üye işyeri kayıtlarına senkronize eder.
// Başarısız olanlar saatte bir yeniden denenir.

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IYZICO_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const service: any = createServiceRoleClient()
  const retryBefore = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: stores, error } = await service
    .from('stores')
    .select('id')
    .eq('iyzico_sync_needed', true)
    .or(`iyzico_sync_error.is.null,iyzico_synced_at.lt.${retryBefore}`)
    .limit(20)

  if (error) {
    console.error('[iyzico sync] DB hatası:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const results: Record<string, any> = {}
  for (const s of stores ?? []) {
    try {
      results[s.id] = await syncStoreSubMerchants(service, s.id)
    } catch (e: any) {
      results[s.id] = { error: e?.message || 'hata' }
    }
  }

  return NextResponse.json({ ok: true, synced: Object.keys(results).length, results })
}
