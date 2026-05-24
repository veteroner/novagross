import { CommissionSettings } from '../../../components/admin/CommissionSettings'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export default async function CommissionSettingsPage() {
  const { supabase } = await requireAdmin('/ayarlar/komisyon')

  const { data, error } = await supabase
    .from('stores')
    .select(`
      id,
      store_name,
      store_slug,
      commission_rate,
      created_at,
      owner:owner_id (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load active sellers for commission settings:', error)
  }

  const sellers = (data ?? []).map((s) => ({ ...s, balance: null }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Komisyon Ayarları</h1>
        <p className="mt-2 text-gray-600">
          Satıcılar için komisyon oranlarını yönetin
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Varsayılan komisyon oranı:</strong> %15
            <br />
            Özel anlaşmalar için satıcı bazında komisyon oranını değiştirebilirsiniz.
          </p>
        </div>
      </div>

      {sellers && sellers.length > 0 ? (
        <CommissionSettings initialSellers={sellers as any} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Henüz aktif satıcı bulunmuyor</p>
        </div>
      )}
    </div>
  )
}
