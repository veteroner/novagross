import { requireAdmin } from '@/lib/auth/requireAdmin'
import { PromoGridClient } from './promo-grid-client'

export const dynamic = 'force-dynamic'

export default async function PromoGridPage() {
  await requireAdmin('/promo-grid')
  return <PromoGridClient />
}
