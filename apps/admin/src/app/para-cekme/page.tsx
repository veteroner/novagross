import { PageHeader, EmptyState } from '@novagross/ui'
import { Wallet } from 'lucide-react'
import WithdrawalList from '@/components/admin/WithdrawalList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export default async function WithdrawalRequestsPage() {
  const { userId, supabase } = await requireAdmin('/para-cekme')

  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select(`
      id,
      store_id,
      amount,
      fee,
      net_amount,
      status,
      bank_name,
      iban,
      account_holder,
      rejection_reason,
      admin_notes,
      transaction_id,
      requested_at,
      processed_at,
      created_at,
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      )
    `)
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('Failed to load withdrawal requests:', error)
  }

  const withdrawalRequests = (data ?? []).map((r: any) => {
    const fee = r.fee ?? 0
    const netAmount = r.net_amount ?? (r.amount ?? 0) - fee
    const requestedAt = r.requested_at ?? r.created_at ?? new Date().toISOString()
    const createdAt = r.created_at ?? requestedAt

    return {
      ...r,
      fee,
      net_amount: netAmount,
      requested_at: requestedAt,
      created_at: createdAt,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Para Çekme Talepleri"
        description="Satıcıların para çekme taleplerini görüntüleyin ve yönetin"
      />

      {withdrawalRequests.length === 0 ? (
        <EmptyState icon={Wallet} title="Henüz para çekme talebi yok" />
      ) : (
        <WithdrawalList requests={withdrawalRequests as any} adminId={userId} />
      )}
    </div>
  )
}
