import { Metadata } from 'next'
import { ApplicationList } from '@/components/admin/ApplicationList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const metadata: Metadata = {
  title: 'Satıcı Başvuruları - Admin Panel',
  description: 'Bekleyen satıcı başvurularını inceleyin ve onaylayın',
}

export default async function SellerApplicationsPage() {
  const { supabase } = await requireAdmin('/saticilar/basvurular')

  const { data, error } = await supabase
    .from('store_applications')
    .select(`
      id,
      user_id,
      store_name,
      company_name,
      tax_number,
      description,
      identity_document_url,
      tax_certificate_url,
      status,
      created_at,
      profiles:user_id (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load store applications:', error)
  }

  const applications = (data ?? []).map((a: any) => ({
    ...a,
    status: a.status ?? 'pending',
    created_at: a.created_at ?? new Date().toISOString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Satıcı Başvuruları
        </h1>
        <p className="text-gray-600">
          Bekleyen başvuruları inceleyin ve onaylayın
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bekleyen Başvuru Yok
          </h3>
          <p className="text-gray-600">
            Şu anda onay bekleyen satıcı başvurusu bulunmuyor.
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>{applications.length}</strong> başvuru onay bekliyor
            </p>
          </div>
          
          <ApplicationList applications={applications} />
        </div>
      )}
    </div>
  )
}
