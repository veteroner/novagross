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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Satıcı Yönetimi</h1>
        <p className="mt-2 text-gray-600">
          Tüm satıcıları görüntüleyin ve yönetin
        </p>
      </div>

      {sellers && sellers.length > 0 ? (
        <SellersList initialSellers={sellers as any} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Henüz satıcı bulunmuyor</p>
        </div>
      )}
    </div>
  )
}
