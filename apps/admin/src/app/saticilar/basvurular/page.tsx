import { Metadata } from 'next'
import { PageHeader, EmptyState } from '@novagross/ui'
import { Mailbox } from 'lucide-react'
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
    <div className="space-y-6">
      <PageHeader
        title="Satıcı Başvuruları"
        description="Bekleyen başvuruları inceleyin ve onaylayın"
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={Mailbox}
          title="Bekleyen başvuru yok"
          description="Şu anda onay bekleyen satıcı başvurusu bulunmuyor."
        />
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
