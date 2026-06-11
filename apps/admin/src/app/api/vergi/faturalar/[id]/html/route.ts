import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/requireAdminApi'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { renderInvoiceHtml } from '@novagross/ui'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  const { id } = await ctx.params

  const supabase = createServiceRoleClient()
  const { data: inv } = await (supabase as any)
    .from('commission_invoices')
    .select(`
      *,
      store:store_id ( store_name, company_name, tax_number, tax_office, email, address, city, district )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!inv) {
    return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
  }

  return new NextResponse(renderInvoiceHtml(inv), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  })
}
