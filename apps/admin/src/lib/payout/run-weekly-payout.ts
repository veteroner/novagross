import { queueBulkEmails } from '@/lib/email/queue'

type ServiceClient = any

type RunWeeklyPayoutParams = {
  service: ServiceClient
  asOf: string // YYYY-MM-DD
  reference?: string | null
  processedBy?: string | null
  adminUrl?: string
}

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function runWeeklyPayoutBatch({
  service,
  asOf,
  reference,
  processedBy,
  adminUrl,
}: RunWeeklyPayoutParams) {
  const { data, error } = await service.rpc('mark_weekly_payouts_paid' as any, {
    p_as_of: asOf,
    p_reference: reference ?? null,
    p_processed_by: processedBy ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const resultRow = Array.isArray(data) ? data[0] : data

  // -----------------------------
  // Seller notification emails
  // -----------------------------
  const nowIso = new Date().toISOString()
  const { data: runs, error: runsError } = await (service as any)
    .from('weekly_payout_runs')
    .select('store_id, amount, reference, email_sent_at')
    .eq('run_date', asOf)
    .is('email_sent_at', null)

  if (runsError) {
    console.warn('[runWeeklyPayoutBatch] weekly_payout_runs query failed:', runsError)
  }

  const pendingRuns = (runs || []) as any[]

  if (pendingRuns.length > 0) {
    const storeIds = pendingRuns.map((r) => r.store_id)

    const { data: stores, error: storesError } = await service
      .from('stores')
      .select('id, store_name, owner_id, iban')
      .in('id', storeIds)

    if (storesError) {
      console.warn('[runWeeklyPayoutBatch] stores query failed:', storesError)
    }

    const storesList = (stores || []) as any[]
    const ownerIds = Array.from(new Set(storesList.map((s) => s.owner_id).filter(Boolean)))

    const { data: owners, error: ownersError } = await service
      .from('profiles')
      .select('id, email')
      .in('id', ownerIds)

    if (ownersError) {
      console.warn('[runWeeklyPayoutBatch] profiles query failed:', ownersError)
    }

    const emailByOwnerId = new Map<string, string>()
    for (const o of owners || []) {
      if (o?.id && o?.email) emailByOwnerId.set(o.id, o.email)
    }

    const emails: any[] = []
    const storeIdsNotified: string[] = []

    for (const r of pendingRuns) {
      const store = storesList.find((s) => s.id === r.store_id)
      const ownerEmail = store?.owner_id ? emailByOwnerId.get(store.owner_id) : null
      if (!store || !ownerEmail) continue

      emails.push({
        to: ownerEmail,
        subject: `Novagross | Haftalık Ödeme Tamamlandı (${asOf})`,
        template: 'seller/weekly-payout-processed',
        priority: 'high',
        data: {
          storeName: store.store_name,
          amount: safeNumber(r.amount),
          iban: store.iban,
          runDate: asOf,
          reference: r.reference || reference || undefined,
        },
      })
      storeIdsNotified.push(r.store_id)
    }

    if (emails.length > 0) {
      await queueBulkEmails(emails as any)

      await (service as any)
        .from('weekly_payout_runs')
        .update({ email_sent_at: nowIso, email_sent_error: null })
        .eq('run_date', asOf)
        .in('store_id', storeIdsNotified)
    }
  }

  // -----------------------------
  // Admin summary email (idempotent)
  // -----------------------------
  try {
    await (service as any)
      .from('weekly_payout_admin_notifications')
      .insert({ run_date: asOf })
      .select('run_date')
      .maybeSingle()
  } catch {
    // ignore
  }

  const { data: lockRow, error: lockError } = await (service as any)
    .from('weekly_payout_admin_notifications')
    .update({ status: 'sending', last_error: null, updated_at: nowIso })
    .eq('run_date', asOf)
    .in('status', ['pending', 'failed'])
    .select('run_date')
    .maybeSingle()

  if (lockError) {
    console.warn('[runWeeklyPayoutBatch] admin notification lock failed:', lockError)
  }

  if (lockRow) {
    try {
      const { data: summaryRows } = await (service as any)
        .from('weekly_payout_runs')
        .select('store_id, amount')
        .eq('run_date', asOf)

      const totalAmount = (summaryRows || []).reduce(
        (sum: number, r: any) => sum + safeNumber(r.amount),
        0
      )
      const storeCount = (summaryRows || []).length

      const { data: top } = await (service as any)
        .from('weekly_payout_runs')
        .select('store_id, amount, stores:store_id(store_name)')
        .eq('run_date', asOf)
        .order('amount', { ascending: false })
        .limit(10)

      const topStores = (top || []).map((r: any) => ({
        storeName: r?.stores?.store_name || r.store_id,
        amount: safeNumber(r.amount),
      }))

      const { data: admins } = await service
        .from('profiles')
        .select('email')
        .in('role', ['admin', 'super_admin'])

      const adminEmails = Array.from(
        new Set((admins || []).map((a: any) => a?.email).filter(Boolean))
      ) as string[]

      if (adminEmails.length > 0) {
        const payoutUrl = adminUrl ? `${adminUrl.replace(/\/$/, '')}/odemeler?asOf=${asOf}` : undefined
        const emails = adminEmails.map((to) => ({
          to,
          subject: `Novagross | Haftalık Payout Özeti (${asOf})`,
          template: 'admin/weekly-payout-summary',
          priority: 'high',
          data: {
            runDate: asOf,
            storeCount,
            totalAmount,
            reference: reference || undefined,
            payoutUrl,
            topStores,
          },
        }))

        await queueBulkEmails(emails as any)
      }

      await (service as any)
        .from('weekly_payout_admin_notifications')
        .update({ status: 'sent', sent_at: nowIso, last_error: null, updated_at: nowIso })
        .eq('run_date', asOf)
    } catch (e: any) {
      const msg = e?.message || 'Unknown error'
      await (service as any)
        .from('weekly_payout_admin_notifications')
        .update({ status: 'failed', last_error: msg, updated_at: nowIso })
        .eq('run_date', asOf)
      console.warn('[runWeeklyPayoutBatch] admin summary email failed:', e)
    }
  }

  return resultRow || { ok: true }
}
