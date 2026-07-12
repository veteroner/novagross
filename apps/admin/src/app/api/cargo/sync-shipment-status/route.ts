import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo, type MngBulkShipmentRow } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG Bulk Query ile durumu değişen tüm gönderileri günlük çeker ve
// order_shipments/orders'ı otomatik günceller. Cron ile çağrılır (MNG_CRON_SECRET).

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.MNG_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// MNG tarih/saat biçimi: dd-MM-yyyy ve HH:mm:ss
function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}
function fmtTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// MNG shipmentStatusCode → bizim order_shipments.status enum
// 1:Hazırlandı 2:Transfer 3:Teslimat Birimine Ulaştı 4:Alıcı Adresine Yönlendirildi
// 5:Teslim Edildi 6:Teslim Edilemedi 7:Geri Geliyor 8:Destek Gerekiyor
function mapStatusCode(code?: number): string | null {
  switch (code) {
    case 1:
      return 'preparing'
    case 2:
    case 3:
      return 'in_transit'
    case 4:
      return 'out_for_delivery'
    case 5:
      return 'delivered'
    case 6:
      return 'failed'
    case 7:
      return 'returned'
    default:
      return null // 8 (destek gerekiyor) ve bilinmeyenler: statüyü değiştirme
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = mngKargo.isConfigured()
  if (!cfg.ok) {
    return NextResponse.json({ ok: false, error: `MNG eksik ayar: ${cfg.missing.join(', ')}` }, { status: 500 })
  }

  // Varsayılan: son 26 saat (cron günde 1 kez çalışsa da örtüşme payı bırakır)
  const body = await req.json().catch(() => ({}))
  const hoursBack = Number(body?.hoursBack) || 26
  const since = new Date(Date.now() - hoursBack * 3600_000)

  const service: any = createServiceRoleClient()
  const summary = { fetched: 0, matched: 0, updated: 0, skipped: 0, errors: [] as string[] }

  try {
    const rows: MngBulkShipmentRow[] = await mngKargo.getStatusChangedShipments(
      fmtDate(since),
      fmtTime(since)
    )
    summary.fetched = rows.length

    for (const row of rows) {
      const s = row.shipment
      const ref = String(s?.referenceId || '').trim().toUpperCase()
      const newStatus = mapStatusCode(s?.shipmentStatusCode)
      if (!ref || !newStatus) {
        summary.skipped++
        continue
      }

      const { data: shipment } = await service
        .from('order_shipments')
        .select('id, order_id, status')
        .eq('tracking_number', ref)
        .maybeSingle()

      if (!shipment) {
        summary.skipped++
        continue
      }
      summary.matched++

      if (shipment.status === newStatus) {
        summary.skipped++ // zaten güncel
        continue
      }

      const update: any = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'delivered') {
        update.delivered_at = s?.deliveryDate || new Date().toISOString()
      }

      const { error: updErr } = await service
        .from('order_shipments')
        .update(update)
        .eq('id', shipment.id)

      if (updErr) {
        summary.errors.push(`${ref}: ${updErr.message}`)
        continue
      }

      await service.from('shipping_status_history').insert({
        shipment_id: shipment.id,
        status: newStatus,
        location: s?.receivingBranch || s?.shipperBranch || null,
        description: `MNG durum güncellemesi (kod ${s?.shipmentStatusCode})`,
        timestamp: new Date().toISOString(),
        raw_data: row,
      })

      // Teslim edildiyse siparişi de güncelle
      if (newStatus === 'delivered') {
        await service
          .from('orders')
          .update({ status: 'delivered', updated_at: new Date().toISOString() })
          .eq('id', shipment.order_id)
      }

      summary.updated++
    }

    return NextResponse.json({ ok: true, summary })
  } catch (e: any) {
    console.error('[cargo sync-shipment-status] error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Hata', summary }, { status: 500 })
  }
}
