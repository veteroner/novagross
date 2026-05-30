import { requireAdmin } from '@/lib/auth/requireAdmin'
import { CouponsClient, type CouponRow } from './coupons-client'

export const dynamic = 'force-dynamic'

export default async function CouponsPage() {
  const { supabase } = await requireAdmin('/kuponlar')

  const { data, error } = await supabase
    .from('coupons')
    .select(
      'id, code, description, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, used_count, starts_at, expires_at, is_active, free_shipping, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[Kuponlar] query failed:', error)
  }

  const coupons = (data ?? []) as CouponRow[]

  return <CouponsClient coupons={coupons} />
}
