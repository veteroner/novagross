import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * Müşterinin kendi siparişine ait faturayı indirir. Signed URL yerine
 * stream: her istekte auth doğrulanır, link paylaşılamaz (model:
 * apps/seller/src/app/api/vergi/fatura/[id]/route.ts).
 */
export async function GET(_request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
  }

  // RLS (order_invoices: "Customer views own order invoices") zaten
  // yalnızca kullanıcının kendi siparişine ait faturayı döner; ek olarak
  // orders.user_id eşleşmesini burada da doğruluyoruz (IDOR koruması).
  const { data: invoice } = await (supabase as any)
    .from('order_invoices')
    .select('id, file_path, order:orders!inner(id, order_number, user_id)')
    .eq('id', params.invoiceId)
    .eq('order.user_id', user.id)
    .maybeSingle()

  if (!invoice) {
    return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
  }

  const service = createServiceRoleClient()
  const { data: file, error: downloadError } = await service.storage
    .from('invoices')
    .download(invoice.file_path)
  if (downloadError || !file) {
    return NextResponse.json({ error: 'Fatura indirilemedi' }, { status: 502 })
  }

  const orderNumber = Array.isArray(invoice.order) ? invoice.order[0]?.order_number : (invoice.order as any)?.order_number
  const buffer = await file.arrayBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="fatura-${orderNumber || params.invoiceId}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'",
    },
  })
}
