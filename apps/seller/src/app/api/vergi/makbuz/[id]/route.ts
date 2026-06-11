import { NextRequest, NextResponse } from 'next/server'
import { requireSellerApi } from '@/lib/auth/requireSellerApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tl(n: any): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  const { storeId } = auth

  const { id } = await ctx.params

  const service = createServiceRoleClient()
  const { data: receipt } = await (service as any)
    .from('withholding_receipts')
    .select(`
      id, total_base_amount, total_withholding_amount, total_orders, receipt_number, created_at,
      period:period_id ( year, month, status, submitted_at, submission_reference ),
      store:store_id ( id, store_name, company_name, tax_number, tax_office, taxpayer_type )
    `)
    .eq('id', id)
    .eq('store_id', storeId) // IDOR koruması: yalnızca kendi makbuzu
    .maybeSingle()

  if (!receipt) {
    return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 })
  }

  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Novagross'
  const p = receipt.period ?? {}
  const s = receipt.store ?? {}
  const periodLabel = `${MONTH_NAMES_TR[p.month] ?? ''} ${p.year ?? ''}`
  const docNo = receipt.receipt_number
    ?? `TVK-${p.year}${String(p.month).padStart(2, '0')}-${String(receipt.id).slice(0, 8).toUpperCase()}`
  const submitted = p.status === 'submitted' || p.status === 'paid' || p.status === 'closed'

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Tevkifat Belgesi — ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 760px; margin: 0 auto; font-size: 14px; line-height: 1.55; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 800; color: #ea580c; }
  .doctitle { text-align: right; }
  .doctitle h1 { font-size: 16px; letter-spacing: 0.5px; }
  .doctitle .no { font-family: ui-monospace, monospace; font-size: 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #fff7ed; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
  td.num, th.num { text-align: right; }
  .total td { font-weight: 700; background: #fafafa; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0 4px; }
  .meta dt { color: #777; font-size: 12px; }
  .meta dd { font-weight: 600; margin-bottom: 6px; }
  .note { font-size: 12px; color: #555; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 20px; }
  .footer { margin-top: 28px; font-size: 11px; color: #999; text-align: center; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: ${submitted ? '#dcfce7' : '#fef9c3'}; color: ${submitted ? '#166534' : '#854d0e'}; }
  .printbar { text-align: right; margin-bottom: 16px; }
  .printbar button { background: #ea580c; color: #fff; border: 0; border-radius: 6px; padding: 8px 18px; font-size: 14px; cursor: pointer; }
  @media print { .printbar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="printbar"><button onclick="window.print()">Yazdır / PDF kaydet</button></div>

  <div class="head">
    <div>
      <div class="brand">${esc(brand)}</div>
      <div style="font-size:12px;color:#666">Elektronik Ticaret Pazaryeri</div>
    </div>
    <div class="doctitle">
      <h1>GELİR VERGİSİ TEVKİFAT BELGESİ</h1>
      <div class="no">Belge No: ${esc(docNo)}</div>
      <div class="no">Düzenleme: ${esc(new Date().toLocaleDateString('tr-TR'))}</div>
    </div>
  </div>

  <dl class="meta">
    <div><dt>Satıcı / Mağaza</dt><dd>${esc(s.store_name)}</dd></div>
    <div><dt>Şirket Ünvanı</dt><dd>${esc(s.company_name || '—')}</dd></div>
    <div><dt>VKN / TCKN</dt><dd>${esc(s.tax_number || '—')}</dd></div>
    <div><dt>Vergi Dairesi</dt><dd>${esc(s.tax_office || '—')}</dd></div>
    <div><dt>Tevkifat Dönemi</dt><dd>${esc(periodLabel)}</dd></div>
    <div><dt>Beyan Durumu</dt><dd><span class="badge">${submitted ? 'GİB’e beyan edildi' : 'Dönem açık — beyan bekleniyor'}</span></dd></div>
    ${p.submission_reference ? `<div><dt>GİB Tahakkuk No</dt><dd>${esc(p.submission_reference)}</dd></div>` : ''}
  </dl>

  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th class="num">Tutar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Tevkifata konu sipariş sayısı</td>
        <td class="num">${esc(receipt.total_orders)}</td>
      </tr>
      <tr>
        <td>Tevkifat matrahı (KDV hariç satış bedeli)</td>
        <td class="num">${esc(tl(receipt.total_base_amount))}</td>
      </tr>
      <tr>
        <td>Tevkifat oranı</td>
        <td class="num">%1</td>
      </tr>
      <tr class="total">
        <td>Kesilen gelir vergisi stopajı</td>
        <td class="num">${esc(tl(receipt.total_withholding_amount))}</td>
      </tr>
    </tbody>
  </table>

  <div class="note">
    <strong>Yasal dayanak:</strong> 193 sayılı GVK md. 94 ve 5520 sayılı KVK md. 15/30 kapsamında,
    7524 sayılı Kanun ile eklenen hüküm ve 23.12.2024 tarihli GİB Tebliği uyarınca, 6563 sayılı Kanun
    kapsamındaki elektronik ticaret aracı hizmet sağlayıcıları, satıcılara yaptıkları ödemelerden %1
    oranında tevkifat yapmakla yükümlüdür. Bu belgede gösterilen tutar ${esc(brand)} tarafından
    Muhtasar ve Prim Hizmet Beyannamesi ile beyan edilir. Satıcı, bu tutarı geçici vergi ve yıllık
    gelir/kurumlar vergisi beyannamesinde <strong>mahsup edebilir</strong>.
  </div>

  <div class="footer">
    Bu belge ${esc(brand)} satıcı paneli üzerinden elektronik olarak üretilmiştir — ${esc(new Date().toISOString().slice(0, 10))}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  })
}
