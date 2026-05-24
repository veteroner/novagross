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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Para Çekme Talepleri</h1>
        <p className="text-muted-foreground">
          Satıcıların para çekme taleplerini görüntüleyin ve yönetin
        </p>
      </div>

      {withdrawalRequests.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">Henüz para çekme talebi bulunmuyor.</p>
        </div>
      ) : (
        <WithdrawalList requests={withdrawalRequests as any} adminId={userId} />
      )}
    </div>
  )
}
