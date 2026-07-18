import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Kargolanmış/teslim edilmiş ama faturası yüklenmemiş siparişler için
// satıcıya hatırlatma (due_date'e ≤2 gün) / eskalasyon (due_date geçmiş)
// e-postası. Cron ile çağrılır (MARKETING_CRON_SECRET); her (sipariş,
// mağaza, tür) kombinasyonu invoice_reminder_log ile yalnızca 1 kez gönderilir.

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.MARKETING_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceRoleClient() as any
  const summary = { checked: 0, upcoming: 0, overdue: 0, skipped: 0, errors: 0 }

  try {
    const { data: obligations, error } = await db
      .from('order_invoice_obligations')
      .select('order_id, store_id, order_number, due_date')
      .is('invoice_id', null)
    if (error) throw new Error(error.message)
    summary.checked = (obligations || []).length

    const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'
    const now = Date.now()

    for (const ob of obligations || []) {
      const dueMs = new Date(ob.due_date).getTime()
      const daysLeft = (dueMs - now) / (24 * 60 * 60 * 1000)
      const kind: 'upcoming' | 'overdue' | null = daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'upcoming' : null
      if (!kind) {
        summary.skipped++
        continue
      }

      // Dedup: bu (sipariş, mağaza, tür) için daha önce gönderildiyse atla
      const { data: already } = await db
        .from('invoice_reminder_log')
        .select('id')
        .eq('order_id', ob.order_id)
        .eq('store_id', ob.store_id)
        .eq('kind', kind)
        .maybeSingle()
      if (already) {
        summary.skipped++
        continue
      }

      const { data: store } = await db
        .from('stores')
        .select('store_name, email, owner_id')
        .eq('id', ob.store_id)
        .maybeSingle()
      if (!store) {
        summary.skipped++
        continue
      }

      let email: string | null = store.email
      if (!email && store.owner_id) {
        const { data: owner } = await db
          .from('profiles')
          .select('email')
          .eq('id', store.owner_id)
          .maybeSingle()
        email = owner?.email || null
      }
      if (!email) {
        summary.skipped++
        continue
      }

      const { error: emailError } = await db.from('email_queue').insert({
        recipient: email,
        template: 'orders/order-reminder-seller',
        subject:
          kind === 'overdue'
            ? `#${ob.order_number} faturası gecikti — hemen yükleyin`
            : `#${ob.order_number} faturası için son gün yaklaşıyor`,
        data: {
          orderNumber: ob.order_number,
          dueDateLabel: new Date(ob.due_date).toLocaleDateString('tr-TR'),
          isOverdue: kind === 'overdue',
          panelUrl: `${sellerUrl}/siparisler`,
        },
        priority: kind === 'overdue' ? 'high' : 'medium',
        scheduled_at: new Date().toISOString(),
        status: 'pending',
      })
      if (emailError) {
        summary.errors++
        continue
      }

      await db.from('invoice_reminder_log').insert({
        order_id: ob.order_id,
        store_id: ob.store_id,
        kind,
      })

      if (kind === 'overdue') summary.overdue++
      else summary.upcoming++
    }

    return NextResponse.json({ ok: true, summary })
  } catch (error: any) {
    console.error('[invoice-reminders] error:', error)
    return NextResponse.json({ ok: false, error: error?.message, summary }, { status: 500 })
  }
}
