import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { SupportClient } from './support-client'

export const dynamic = 'force-dynamic'

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  await requireAdmin('/destek-talepleri')
  const db = createServiceRoleClient()

  const statusFilter = searchParams?.status || 'active'

  let query = (db as any)
    .from('support_tickets')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200)

  if (statusFilter === 'active') query = query.in('status', ['open', 'in_progress', 'waiting_customer'])
  else if (statusFilter !== 'all') query = query.eq('status', statusFilter)

  const { data: tickets } = await query

  // Mağaza adlarını çöz
  const storeIds = Array.from(new Set((tickets || []).map((t: any) => t.store_id).filter(Boolean)))
  const storeNames: Record<string, string> = {}
  if (storeIds.length > 0) {
    const { data: stores } = await (db as any).from('stores').select('id, store_name').in('id', storeIds)
    for (const s of stores || []) storeNames[s.id] = s.store_name
  }

  // Her ticket'ın mesajları (son seçili için lazy değil — hepsini çekmek ağır olur, client seçince çeker)
  return <SupportClient tickets={(tickets || []) as any} storeNames={storeNames} statusFilter={statusFilter} />
}
