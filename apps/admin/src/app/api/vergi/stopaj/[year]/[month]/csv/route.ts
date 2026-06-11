import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/requireAdminApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// CSV satırı için güvenli kaçış (virgül/tırnak/yeni satır)
function csvCell(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function tl(n: any): string {
  const num = Number(n || 0)
  return num.toFixed(2).replace('.', ',') // TR: virgül ondalık
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ year: string; month: string }> }
) {
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  const { year, month } = await ctx.params
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: 'invalid period' }, { status: 400 })
  }

  const url = new URL(req.url)
  const detailed = url.searchParams.get('detailed') === '1'

  const supabase = createServiceRoleClient()

  const { data: period } = await (supabase as any)
    .from('withholding_periods')
    .select('*')
    .eq('year', y)
    .eq('month', m)
    .maybeSingle()

  if (!period) {
    return NextResponse.json({ error: 'period not found' }, { status: 404 })
  }

  let lines: string[] = []

  if (!detailed) {
    // Özet CSV: mağaza bazlı toplam (GİB muhtasar beyan için uygun)
    const { data: receipts } = await (supabase as any)
      .from('withholding_receipts')
      .select(`
        total_base_amount, total_withholding_amount, total_orders,
        store:store_id ( id, store_name, company_name, tax_number, tax_office, taxpayer_type )
      `)
      .eq('period_id', period.id)
      .order('total_withholding_amount', { ascending: false })

    lines.push(
      [
        'Sıra', 'Mağaza Adı', 'Şirket Ünvanı', 'VKN/TCKN', 'Vergi Dairesi',
        'Mükellef Tipi', 'Sipariş Sayısı', 'Matrah (KDV hariç)', 'Stopaj Oranı', 'Stopaj Tutarı',
      ]
        .map(csvCell)
        .join(',')
    )
    ;(receipts ?? []).forEach((r: any, i: number) => {
      lines.push(
        [
          i + 1,
          r.store?.store_name ?? '',
          r.store?.company_name ?? '',
          r.store?.tax_number ?? '',
          r.store?.tax_office ?? '',
          r.store?.taxpayer_type ?? '',
          r.total_orders,
          tl(r.total_base_amount),
          '%1',
          tl(r.total_withholding_amount),
        ]
          .map(csvCell)
          .join(',')
      )
    })

    lines.push('')
    lines.push(`Dönem,${y}-${String(m).padStart(2, '0')}`)
    lines.push(`Toplam Matrah,${tl(period.total_base_amount)}`)
    lines.push(`Toplam Stopaj,${tl(period.total_withholding_amount)}`)
    lines.push(`Sipariş,${period.total_orders}`)
  } else {
    // Detaylı CSV: sipariş kalemi bazlı (denetim için)
    const { data: items } = await (supabase as any)
      .from('order_items')
      .select(`
        id, order_id, quantity, price, kdv_amount, withholding_base, withholding_rate, withholding_amount,
        commission_amount, name,
        order:order_id!inner ( order_number, updated_at, email ),
        store:store_id ( id, store_name, tax_number, tax_office, company_name )
      `)
      .gt('withholding_amount', 0)
      .gte('order.updated_at', `${y}-${String(m).padStart(2, '0')}-01`)
      .lt(
        'order.updated_at',
        m === 12
          ? `${y + 1}-01-01`
          : `${y}-${String(m + 1).padStart(2, '0')}-01`
      )

    lines.push(
      [
        'Sipariş No', 'Tarih', 'Mağaza', 'Şirket Ünvanı', 'VKN/TCKN',
        'Vergi Dairesi', 'Ürün', 'Adet', 'Brüt', 'KDV', 'Matrah', 'Stopaj %', 'Stopaj',
      ]
        .map(csvCell)
        .join(',')
    )

    ;(items ?? []).forEach((it: any) => {
      if (!it.order) return
      lines.push(
        [
          it.order?.order_number ?? '',
          it.order?.updated_at?.slice(0, 10) ?? '',
          it.store?.store_name ?? '',
          it.store?.company_name ?? '',
          it.store?.tax_number ?? '',
          it.store?.tax_office ?? '',
          it.name ?? '',
          it.quantity,
          tl(Number(it.price) * Number(it.quantity)),
          tl(it.kdv_amount),
          tl(it.withholding_base),
          (Number(it.withholding_rate) * 100).toFixed(2).replace('.', ',') + '%',
          tl(it.withholding_amount),
        ]
          .map(csvCell)
          .join(',')
      )
    })
  }

  // BOM ekle (Excel TR için UTF-8 doğru gözüksün)
  const csv = '﻿' + lines.join('\r\n') + '\r\n'

  const filename = detailed
    ? `stopaj-detayli-${y}-${String(m).padStart(2, '0')}.csv`
    : `stopaj-ozet-${y}-${String(m).padStart(2, '0')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
