import { PageHeader, EmptyState } from '@novagross/ui'
import { Headphones } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { SellerSupportClient } from './support-client'

export const dynamic = 'force-dynamic'

export default async function SellerSupportPage() {
  const { supabase, storeId } = await requireSeller('/destek')

  // Bu mağazaya ait talepler (kendi talepleri + kendisine yönlenen müşteri talepleri)
  const { data: tickets } = await (supabase as any)
    .from('support_tickets')
    .select('id, ticket_no, source, customer_name, customer_email, category, subject, summary, status, priority, created_at, last_message_at')
    .eq('store_id', storeId)
    .order('last_message_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Destek Talepleri"
        description="Mağazanıza yönlendirilen müşteri talepleri ve yöneticiye ilettiğiniz talepler"
      />
      {!tickets || tickets.length === 0 ? (
        <EmptyState
          icon={Headphones}
          title="Talep yok"
          description="Henüz size yönlendirilmiş bir destek talebi bulunmuyor. Sağ alttaki destek butonundan yöneticiye talep iletebilirsiniz."
        />
      ) : (
        <SellerSupportClient tickets={tickets as any} />
      )}
    </div>
  )
}
