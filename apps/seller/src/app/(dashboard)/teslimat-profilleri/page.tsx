import { Card, PageHeader, EmptyState } from '@novagross/ui'
import { Truck } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { ProfilesClient, type ShippingMethod, type ShippingProfileRow } from './profiles-client'

export const dynamic = 'force-dynamic'

export default async function ShippingProfilesPage() {
  const { supabase, storeId } = await requireSeller('/teslimat-profilleri')

  const [methodsRes, settingsRes] = await Promise.all([
    supabase
      .from('shipping_methods')
      .select(
        `id, name, code, description, estimated_delivery_days, estimated_delivery_days_max,
         carrier:carrier_id ( name )`
      )
      .eq('is_active', true)
      .order('name'),
    (supabase as any)
      .from('store_shipping_settings')
      .select(
        'method_id, custom_base_price, custom_free_shipping_threshold, processing_time_days, is_enabled'
      )
      .eq('store_id', storeId),
  ])

  const methods = (methodsRes.data ?? []) as ShippingMethod[]
  const profiles = (settingsRes.data ?? []) as ShippingProfileRow[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teslimat Profilleri"
        description="Her kargo yöntemi için özel ücret, ücretsiz kargo limiti ve hazırlama süresi belirleyin"
      />

      {methods.length === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="Henüz kargo yöntemi yok"
            description="Platformda tanımlı kargo yöntemi bulunmuyor. Admin ile iletişime geçin."
          />
        </Card>
      ) : (
        <ProfilesClient methods={methods} profiles={profiles} />
      )}
    </div>
  )
}
