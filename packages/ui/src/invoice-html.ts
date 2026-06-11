// Komisyon faturası için yazdırılabilir HTML üretici.
// Admin ve Seller app'leri aynı şablonu kullanır; tarayıcının
// "Yazdır → PDF olarak kaydet" akışıyla PDF elde edilir.

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

export type CommissionInvoiceRecord = {
  invoice_number: string | null
  year: number
  month: number
  commission_base: number | string
  commission_amount: number | string
  kdv_rate: number | string
  kdv_amount: number | string
  total_amount: number | string
  total_orders: number
  status: string
  issued_at: string | null
  earsiv_status?: string | null
  earsiv_uuid?: string | null
  cancel_reason?: string | null
  store?: {
    store_name?: string | null
    company_name?: string | null
    tax_number?: string | null
    tax_office?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    district?: string | null
  } | null
}

export function renderInvoiceHtml(inv: CommissionInvoiceRecord): string {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Novagross'
  const s = inv.store ?? {}
  const periodLabel = `${MONTH_NAMES_TR[inv.month] ?? ''} ${inv.year}`
  const isCancelled = inv.status === 'cancelled'
  const isDraft = inv.status === 'draft'
  const addr = [s.address, s.district, s.city].filter(Boolean).join(', ')

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Komisyon Faturası ${esc(inv.invoice_number ?? '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 760px; margin: 0 auto; font-size: 14px; line-height: 1.55; position: relative; }
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
  .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-size: 72px; font-weight: 900; color: rgba(220, 38, 38, 0.12); pointer-events: none; white-space: nowrap; }
  .printbar { text-align: right; margin-bottom: 16px; }
  .printbar button { background: #ea580c; color: #fff; border: 0; border-radius: 6px; padding: 8px 18px; font-size: 14px; cursor: pointer; }
  @media print { .printbar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  ${isCancelled ? '<div class="watermark">İPTAL</div>' : ''}
  ${isDraft ? '<div class="watermark">TASLAK</div>' : ''}
  <div class="printbar"><button onclick="window.print()">Yazdır / PDF kaydet</button></div>

  <div class="head">
    <div>
      <div class="brand">${esc(brand)}</div>
      <div style="font-size:12px;color:#666">Elektronik Ticaret Pazaryeri</div>
    </div>
    <div class="doctitle">
      <h1>KOMİSYON FATURASI${isDraft ? ' (TASLAK)' : ''}</h1>
      <div class="no">Fatura No: ${esc(inv.invoice_number ?? '—')}</div>
      <div class="no">Dönem: ${esc(periodLabel)}</div>
      ${inv.issued_at ? `<div class="no">Kesim: ${esc(new Date(inv.issued_at).toLocaleDateString('tr-TR'))}</div>` : ''}
    </div>
  </div>

  <dl class="meta">
    <div><dt>Sayın (Alıcı)</dt><dd>${esc(s.company_name || s.store_name || '—')}</dd></div>
    <div><dt>Mağaza</dt><dd>${esc(s.store_name || '—')}</dd></div>
    <div><dt>VKN / TCKN</dt><dd>${esc(s.tax_number || '—')}</dd></div>
    <div><dt>Vergi Dairesi</dt><dd>${esc(s.tax_office || '—')}</dd></div>
    ${addr ? `<div><dt>Adres</dt><dd>${esc(addr)}</dd></div>` : ''}
    ${inv.earsiv_uuid ? `<div><dt>E-Arşiv UUID</dt><dd style="font-family:ui-monospace,monospace;font-size:11px">${esc(inv.earsiv_uuid)}</dd></div>` : ''}
  </dl>

  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th class="num">Miktar</th>
        <th class="num">Birim Fiyat</th>
        <th class="num">Tutar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Pazaryeri komisyon bedeli — ${esc(periodLabel)} dönemi (${esc(inv.total_orders)} sipariş, matrah ${esc(tl(inv.commission_base))})</td>
        <td class="num">1</td>
        <td class="num">${esc(tl(inv.commission_amount))}</td>
        <td class="num">${esc(tl(inv.commission_amount))}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">Ara toplam (KDV hariç)</td>
        <td class="num">${esc(tl(inv.commission_amount))}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right">KDV (%${esc(Number(inv.kdv_rate))})</td>
        <td class="num">${esc(tl(inv.kdv_amount))}</td>
      </tr>
      <tr class="total">
        <td colspan="3" style="text-align:right">GENEL TOPLAM</td>
        <td class="num">${esc(tl(inv.total_amount))}</td>
      </tr>
    </tbody>
  </table>

  ${isCancelled && inv.cancel_reason ? `<div class="note"><strong>İptal gerekçesi:</strong> ${esc(inv.cancel_reason)}</div>` : ''}

  <div class="note">
    Bu fatura, ${esc(periodLabel)} döneminde pazaryeri üzerinden gerçekleşen satışlara ait
    aracılık komisyon hizmet bedelini gösterir. Komisyon tutarı satıcı hakedişinden mahsup
    edilmiştir; ayrıca ödeme yapılmaz. KDV mükellefi satıcılar bu faturadaki KDV'yi indirim
    konusu yapabilir.
  </div>

  <div class="footer">
    ${esc(brand)} — Bu belge elektronik ortamda üretilmiştir. ${esc(new Date().toISOString().slice(0, 10))}
  </div>
</body>
</html>`
}
