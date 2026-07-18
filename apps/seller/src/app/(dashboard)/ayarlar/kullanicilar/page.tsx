import { requireSellerRole } from '@/lib/auth/requireSeller'
import { MembersClient } from './members-client'

export const dynamic = 'force-dynamic'

// Yalnızca Sahip erişebilir; personel/yönetici URL'den gelirse ana sayfaya döner.
export default async function StoreUsersPage() {
  const { storeName } = await requireSellerRole('owner', '/ayarlar/kullanicilar')
  return <MembersClient storeName={storeName} />
}
