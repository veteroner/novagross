'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getEArsivProvider } from '@/lib/earsiv'

export async function generateInvoices(year: number, month: number) {
  await requireAdmin('/vergi/faturalar')
  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    throw new Error('Geçersiz yıl.')
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Geçersiz ay.')
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await (supabase as any).rpc('generate_commission_invoices', {
    p_year: year,
    p_month: month,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/vergi/faturalar')
  return { created: Number(data ?? 0) }
}

export async function issueInvoice(invoiceId: string) {
  const { userId } = await requireAdmin('/vergi/faturalar')
  const supabase = createServiceRoleClient()

  const { data: inv } = await (supabase as any)
    .from('commission_invoices')
    .select(`
      *,
      store:store_id ( store_name, company_name, tax_number, tax_office, email, address, city, district )
    `)
    .eq('id', invoiceId)
    .maybeSingle()

  if (!inv) throw new Error('Fatura bulunamadı.')
  if (inv.status !== 'draft') throw new Error('Yalnızca taslak faturalar kesilebilir.')

  // E-Arşiv sağlayıcısına gönder (mock sağlayıcı dış servise gitmez)
  const provider = getEArsivProvider()
  const result = await provider.sendInvoice({
    invoiceNumber: inv.invoice_number,
    issueDate: new Date().toISOString().slice(0, 10),
    buyer: {
      name: inv.store?.company_name || inv.store?.store_name || 'Bilinmeyen satıcı',
      taxNumber: inv.store?.tax_number ?? null,
      taxOffice: inv.store?.tax_office ?? null,
      address: [inv.store?.address, inv.store?.district, inv.store?.city].filter(Boolean).join(', ') || null,
      email: inv.store?.email ?? null,
    },
    lines: [
      {
        description: `Pazaryeri komisyon bedeli — ${inv.year}/${String(inv.month).padStart(2, '0')} dönemi (${inv.total_orders} sipariş)`,
        quantity: 1,
        unitPrice: Number(inv.commission_amount),
        kdvRate: Number(inv.kdv_rate),
      },
    ],
    totals: {
      base: Number(inv.commission_amount),
      kdv: Number(inv.kdv_amount),
      grandTotal: Number(inv.total_amount),
    },
    note: `Komisyon matrahı (KDV hariç satış toplamı): ${Number(inv.commission_base).toFixed(2)} TL`,
  })

  const update: Record<string, any> = {
    status: 'issued',
    issued_at: new Date().toISOString(),
    issued_by: userId,
    earsiv_provider: provider.name,
    updated_at: new Date().toISOString(),
  }
  if (result.ok) {
    update.earsiv_status = 'sent'
    update.earsiv_uuid = result.providerUuid
    update.earsiv_sent_at = result.sentAt
    update.earsiv_error = null
  } else {
    // Fatura yine kesilir; e-arşiv gönderimi başarısızsa tekrar denenebilir
    update.earsiv_status = 'failed'
    update.earsiv_error = result.error
  }

  const { error } = await (supabase as any)
    .from('commission_invoices')
    .update(update)
    .eq('id', invoiceId)
    .eq('status', 'draft') // race koruması
  if (error) throw new Error(error.message)

  revalidatePath('/vergi/faturalar')
}

export async function cancelInvoice(invoiceId: string, reason: string) {
  await requireAdmin('/vergi/faturalar')
  if (!reason || reason.trim().length < 3) {
    throw new Error('İptal gerekçesi gerekli (min 3 karakter).')
  }

  const supabase = createServiceRoleClient()
  const { data: inv } = await (supabase as any)
    .from('commission_invoices')
    .select('id, status, earsiv_status, earsiv_uuid')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!inv) throw new Error('Fatura bulunamadı.')
  if (inv.status === 'cancelled') throw new Error('Fatura zaten iptal edilmiş.')

  // E-arşive gitmişse sağlayıcıda da iptal et
  if (inv.earsiv_status === 'sent' && inv.earsiv_uuid) {
    const provider = getEArsivProvider()
    const result = await provider.cancelInvoice(inv.earsiv_uuid, reason.trim())
    if (!result.ok) {
      throw new Error(`E-arşiv iptali başarısız: ${result.error}`)
    }
  }

  const { error } = await (supabase as any)
    .from('commission_invoices')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
  if (error) throw new Error(error.message)

  revalidatePath('/vergi/faturalar')
}
