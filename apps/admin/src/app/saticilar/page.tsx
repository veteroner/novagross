import { PageHeader, EmptyState } from '@novagross/ui'
import { Store } from 'lucide-react'
import { SellersList } from '@/components/admin/SellersList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export default async function SellersPage() {
  const { supabase } = await requireAdmin('/saticilar')

  const { data, error } = await supabase
    .from('stores')
    .select(`
      id,
      owner_id,
      store_name,
      store_slug,
      status,
      created_at,
      owner:owner_id (
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load sellers:', error)
  }

  const sellers = (data ?? []).map((s) => ({ ...s, balance: null }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Satıcı Yönetimi"
        description="Tüm satıcıları görüntüleyin ve yönetin"
      />

      {sellers && sellers.length > 0 ? (
        <SellersList initialSellers={sellers as any} />
      ) : (
        <EmptyState icon={Store} title="Henüz satıcı yok" />
      )}
    </div>
  )
}
