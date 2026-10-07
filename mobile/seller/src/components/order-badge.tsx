import { Badge } from '@/components/ui'
import { needsShipping, type SellerOrder } from '@/lib/queries'
import { SHIPMENT_STATUS } from '@/lib/format'

export function OrderBadge({ o }: { o: SellerOrder }) {
  if (o.status === 'cancelled') return <Badge label="İptal" tone="danger" />
  if (needsShipping(o)) return <Badge label="Kargolanacak" tone="primary" />
  if (o.shipment) {
    const s = o.shipment.status
    return <Badge label={SHIPMENT_STATUS[s] ?? s} tone={s === 'delivered' ? 'success' : s === 'failed' ? 'danger' : 'neutral'} />
  }
  return <Badge label={o.status} />
}
