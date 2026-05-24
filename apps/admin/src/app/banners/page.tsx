import { requireAdmin } from '@/lib/auth/requireAdmin'
import { BannersClient } from './banners-client'

export const dynamic = 'force-dynamic'

export default async function BannersPage() {
  await requireAdmin('/banners')
  return <BannersClient />
}
