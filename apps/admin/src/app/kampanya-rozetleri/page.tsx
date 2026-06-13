import { requireAdmin } from '@/lib/auth/requireAdmin'
import { CampaignBadgesClient } from './campaign-badges-client'

export const dynamic = 'force-dynamic'

export default async function CampaignBadgesPage() {
  await requireAdmin('/kampanya-rozetleri')
  return <CampaignBadgesClient />
}
