import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo, type MngBulkShipmentRow } from '@novagross/cargo'
import { queueEmail } from '@/lib/email/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG kargo durum senkronizasyonu (pg_cron, 6 saatte bir — MNG_CRON_SECRET).
//
// 1. Toplu: Bulk Query getStatusChangedShipments (son ~26 saatte durumu değişenler).
//    MNG eski tarihleri reddediyor (26154) → kaçırılan pencere bu yolla geri alınamaz.
// 2. Tekil yedek: teslim edilmemiş tüm MNG gönderileri tek tek sorgulanır
//    (getorder → gönderiye dönüştü mü; dönüştüyse getshipment → durum).
// 3. Uyarı: etiket OKUTULMAMA_ESIK_SAAT saattir var ama MNG'de gönderiye
//    dönüşmemişse (paket şubede bizim barkodla okutulmamış) satıcı + admin e-postası.
// Her çalışma cargo_sync_runs'a yazılır; hatalar artık "değişiklik yok" sayılmaz.

const OKUTULMAMA_ESIK_SAAT = 48
const OPEN_STATUSES_EXCLUDED = ['delivered', 'returned', 'failed', 'cancelled']

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
  switch (Number(code)) {
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

type Summary = {
  bulkFetched: number
  checked: number
  updated: number
  notScanned: number
  alertsSent: number
  unparsed: number
  errors: string[]
}

/** MNG satırını gönderiye uygular; durum değiştiyse true */
async function applyRow(service: any, shipment: any, row: MngBulkShipmentRow, source: string): Promise<boolean> {
  const s = row.shipment
  const newStatus = mapStatusCode(s?.shipmentStatusCode)
  const billOfLandingId = s?.billOfLandingId || s?.billOfLandingID || null
  const newBillOfLanding = !shipment.bill_of_landing_id && billOfLandingId
  if (!newStatus && !newBillOfLanding) return false
  if (newStatus === shipment.status && !newBillOfLanding) return false

  const update: any = { updated_at: new Date().toISOString() }
  const statusChanged = !!newStatus && newStatus !== shipment.status
  if (statusChanged) update.status = newStatus
  if (newBillOfLanding) update.bill_of_landing_id = billOfLandingId
  if (newStatus === 'delivered' && shipment.status !== 'delivered') {
    update.delivered_at = s?.deliveryDate || new Date().toISOString()
  }

  const { error } = await service.from('order_shipments').update(update).eq('id', shipment.id)
  if (error) throw new Error(`${shipment.tracking_number}: ${error.message}`)

  if (statusChanged) {
    await service.from('shipping_status_history').insert({
      shipment_id: shipment.id,
      status: newStatus,
      location: s?.receivingBranch || s?.shipperBranch || null,
      description: `MNG durum güncellemesi (${source}, kod ${s?.shipmentStatusCode})`,
      timestamp: new Date().toISOString(),
      raw_data: row,
    })
    if (newStatus === 'delivered') {
      await service
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', shipment.order_id)
    }
    shipment.status = newStatus
  }
  return true
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = mngKargo.isConfigured()
  if (!cfg.ok) {
    return NextResponse.json({ ok: false, error: `MNG eksik ayar: ${cfg.missing.join(', ')}` }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const hoursBack = Number(body?.hoursBack) || 26
  const since = new Date(Date.now() - hoursBack * 3600_000)

  const service: any = createServiceRoleClient()
  const summary: Summary = { bulkFetched: 0, checked: 0, updated: 0, notScanned: 0, alertsSent: 0, unparsed: 0, errors: [] }

  // ---- 1. Toplu sorgu ----
  try {
    const rows = await mngKargo.getStatusChangedShipments(fmtDate(since), fmtTime(since))
    summary.bulkFetched = rows.length
    for (const row of rows) {
      const ref = String(row.shipment?.referenceId || '').trim().toUpperCase()
      if (!ref) continue
      const { data: shipment } = await service
        .from('order_shipments')
        .select('id, order_id, status, tracking_number, bill_of_landing_id')
        .eq('tracking_number', ref)
        .maybeSingle()
      if (!shipment) continue
      try {
        if (await applyRow(service, shipment, row, 'toplu')) summary.updated++
      } catch (e: any) {
        summary.errors.push(e.message)
      }
    }
  } catch (e: any) {
    summary.errors.push(`toplu sorgu: ${e?.message || e}`)
  }

  // ---- 2. Tekil yedek kontrol + 3. okutulmamış paket ----
  const { data: open, error: openErr } = await service
    .from('order_shipments')
    .select(`
      id, order_id, status, tracking_number, bill_of_landing_id, created_at,
      mng_shipment_id, mng_not_scanned_alerted_at,
      orders!inner ( order_number, order_items ( store_id, stores ( store_name, email ) ) )
    `)
    .eq('provider_code', 'mng')
    .not('tracking_number', 'is', null)
    .not('status', 'in', `(${OPEN_STATUSES_EXCLUDED.join(',')})`)
    .order('created_at', { ascending: true })
    .limit(100)

  if (openErr) summary.errors.push(`açık gönderiler: ${openErr.message}`)

  const notScanned: { shipment: any; hours: number }[] = []

  for (const shipment of (open ?? []) as any[]) {
    if (String(shipment.tracking_number).startsWith('MOCK')) continue
    summary.checked++
    try {
      const order = await mngKargo.getOrder(shipment.tracking_number)
      const patch: any = { mng_last_checked_at: new Date().toISOString() }

      if (order?.isTransformedToShipment) {
        if (order.shipmentId && order.shipmentId !== shipment.mng_shipment_id) patch.mng_shipment_id = order.shipmentId
        await service.from('order_shipments').update(patch).eq('id', shipment.id)

        const res = await mngKargo.getShipment(shipment.tracking_number)
        if (res?.row) {
          if (await applyRow(service, shipment, res.row, 'tekil')) summary.updated++
        } else if (res) {
          // Gerçek gönderide yanıt şeması henüz doğrulanmadı — ham yanıtı logla
          summary.unparsed++
          console.warn('[cargo sync] getshipment şeması tanınmadı', shipment.tracking_number, JSON.stringify(res.raw)?.slice(0, 1500))
        }
      } else {
        await service.from('order_shipments').update(patch).eq('id', shipment.id)
        const hours = Math.floor((Date.now() - new Date(shipment.created_at).getTime()) / 3600_000)
        if (hours >= OKUTULMAMA_ESIK_SAAT) {
          summary.notScanned++
          if (!shipment.mng_not_scanned_alerted_at) notScanned.push({ shipment, hours })
        }
      }
    } catch (e: any) {
      summary.errors.push(`${shipment.tracking_number}: ${e?.message || e}`)
    }
  }

  // Uyarı e-postaları: satıcıya mağaza bazında, admin'e tek özet
  if (notScanned.length > 0) {
    const toRow = ({ shipment, hours }: { shipment: any; hours: number }) => {
      const store = shipment.orders?.order_items?.find((i: any) => i.stores)?.stores
      return {
        storeEmail: store?.email as string | undefined,
        row: {
          orderNumber: shipment.orders?.order_number,
          trackingNumber: shipment.tracking_number,
          storeName: store?.store_name,
          labelCreatedAt: new Date(shipment.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
          hours,
        },
      }
    }
    const items = notScanned.map(toRow)

    const byStore = new Map<string, any[]>()
    for (const it of items) {
      if (!it.storeEmail) continue
      byStore.set(it.storeEmail, [...(byStore.get(it.storeEmail) ?? []), it.row])
    }
    for (const [email, rows] of byStore) {
      await queueEmail({
        to: email,
        subject: `Kargo şubede okutulmamış: ${rows.map((r) => '#' + r.orderNumber).join(', ')}`,
        template: 'cargo/not-scanned-alert',
        data: { audience: 'seller', rows, panelUrl: 'https://seller.novagross.com/siparisler' },
        priority: 'high',
      })
      summary.alertsSent++
    }

    const { data: admins } = await service.from('profiles').select('email').in('role', ['admin', 'super_admin'])
    for (const a of (admins ?? []) as any[]) {
      if (!a.email) continue
      await queueEmail({
        to: a.email,
        subject: `[Admin] ${items.length} kargo şubede okutulmamış`,
        template: 'cargo/not-scanned-alert',
        data: { audience: 'admin', rows: items.map((i) => i.row), panelUrl: 'https://admin.novagross.com/siparisler' },
        priority: 'high',
      })
      summary.alertsSent++
    }

    await service
      .from('order_shipments')
      .update({ mng_not_scanned_alerted_at: new Date().toISOString() })
      .in('id', notScanned.map((n) => n.shipment.id))
  }

  const ok = summary.errors.length === 0
  await service.from('cargo_sync_runs').insert({ ok, summary, errors: summary.errors })
  if (!ok) console.error('[cargo sync] hatalar:', summary.errors)

  return NextResponse.json({ ok, summary }, { status: ok ? 200 : 207 })
}
