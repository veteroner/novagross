import { requireSellerRole } from '@/lib/auth/requireSeller'
import { CouponsClient, type CouponRow } from './coupons-client'

export const dynamic = 'force-dynamic'

export default async function SellerCouponsPage() {
  const { supabase, userId } = await requireSellerRole('manager', '/kuponlar')

  const { data } = await supabase
    .from('coupons')
    .select(
      'id, code, description, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, used_count, starts_at, expires_at, is_active, free_shipping, created_at'
    )
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  return <CouponsClient coupons={(data ?? []) as CouponRow[]} />
}
