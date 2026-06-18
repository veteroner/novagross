import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG faturalarından gerçek kargo ücretini çekip satıcı hak edişinden düşer.
// Cron ile çağrılır (Netlify scheduled function). Auth: MNG_CRON_SECRET.

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.MNG_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// MNG tarih biçimi: dd.MM.yyyy
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function parseAmount(v: any): number {
  if (v == null) return 0
  // MNG tutarları "12,34" ya da "12.34" olabilir
  const s = String(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return isFinite(n) ? n : Number(String(v).replace(',', '.')) || 0
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = mngKargo.isConfigured()
  if (!cfg.ok) {
    return NextResponse.json({ ok: false, error: `MNG eksik ayar: ${cfg.missing.join(', ')}` }, { status: 500 })
  }

  // Varsayılan: son 35 gün (MNG faturaları aylık)
  const body = await req.json().catch(() => ({}))
  const days = Number(body?.days) || 35
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const service: any = createServiceRoleClient()
  const summary = { invoices: 0, details: 0, matched: 0, applied: 0, skipped: 0, errors: [] as string[] }

  try {
    const invoices = await mngKargo.getInvoiceList(fmt(start), fmt(end))
    summary.invoices = invoices.length

    for (const inv of invoices) {
      const details = await mngKargo.getInvoiceDetailList({
        invoiceNumber: inv.invoiceNumber,
        invoiceSerialNumber: inv.invoiceSerialNumber,
        eInvoiceId: inv.eInvoiceId,
        invoiceType: 1,
      })
      summary.details += details.length

      for (const line of details) {
        // Bizim referansımız createDetailedOrder'da shipper.refCustomerId olarak gönderildi
        const ref = String(line.refCustomerId || '').trim().toUpperCase()
        if (!ref) {
          summary.skipped++
          continue
        }
        const fee = parseAmount(line.finalTotal ?? line.subTotal)
        if (fee <= 0) {
          summary.skipped++
          continue
        }

        // referans = order_shipments.tracking_number (oluştururken referenceId = tracking)
        const { data: shipment } = await service
          .from('order_shipments')
          .select('order_id, cargo_fee')
          .eq('tracking_number', ref)
          .maybeSingle()

        if (!shipment?.order_id) {
          summary.skipped++
          continue
        }
        summary.matched++
        if (shipment.cargo_fee != null) {
          summary.skipped++ // zaten işlenmiş
          continue
        }

        const { error } = await service.rpc('apply_cargo_fee', {
          p_order_id: shipment.order_id,
          p_fee: fee,
          p_invoice_no: inv.invoiceNumber || null,
        })
        if (error) {
          summary.errors.push(`${ref}: ${error.message}`)
        } else {
          summary.applied++
        }
      }
    }

    return NextResponse.json({ ok: true, summary })
  } catch (e: any) {
    console.error('[cargo reconcile] error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Hata', summary }, { status: 500 })
  }
}
