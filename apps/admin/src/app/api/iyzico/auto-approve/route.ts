import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUTO_APPROVE_DAYS = 30

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IYZICO_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'

  if (!apiKey || !secretKey) {
    return NextResponse.json({ ok: false, error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
  }

  const service = createServiceRoleClient()
  const cutoff = new Date(Date.now() - AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: items, error } = await service
    .from('order_items')
    .select('id, iyzico_payment_transaction_id, order_id, orders!inner(created_at, payment_status)')
    .eq('iyzico_approval_status', 'pending')
    .not('iyzico_payment_transaction_id', 'is', null)
    .lt('orders.created_at', cutoff)
    .eq('orders.payment_status', 'paid')
    .limit(100)

  if (error) {
    console.error('[iyzico auto-approve] DB hatası:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, approved: 0, message: 'Onaylanacak kalem yok' })
  }

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  let approved = 0
  let failed = 0
  const failures: { id: string; error: string }[] = []

  for (const item of items) {
    const paymentTransactionId = (item as any).iyzico_payment_transaction_id
    try {
      const result = await new Promise<any>((resolve, reject) => {
        iyzipay.approval.create(
          {
            locale: 'tr',
            conversationId: `auto_${item.id.slice(0, 8)}_${Date.now()}`,
            paymentTransactionId,
          },
          (err: any, res: any) => { if (err) reject(err); else resolve(res) }
        )
      })

      if (result.status === 'success') {
        await service
          .from('order_items')
          .update({ iyzico_approval_status: 'approved', iyzico_approved_at: new Date().toISOString() } as any)
          .eq('id', item.id)
        approved++
        console.log(`[iyzico auto-approve] ✓ ${item.id}`)
      } else {
        failed++
        failures.push({ id: item.id, error: result.errorMessage || result.errorCode })
        console.error(`[iyzico auto-approve] ✗ ${item.id}:`, result.errorMessage)
      }
    } catch (err: any) {
      failed++
      failures.push({ id: item.id, error: err?.message || 'Bilinmeyen hata' })
      console.error(`[iyzico auto-approve] ✗ ${item.id}:`, err?.message)
    }
  }

  console.log(`[iyzico auto-approve] ${approved} onaylandı, ${failed} başarısız`)
  return NextResponse.json({ ok: true, approved, failed, ...(failures.length > 0 && { failures }) })
}
