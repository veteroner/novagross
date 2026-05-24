import { Card, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { MailX, Calendar, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

type EmailUnsubscribe = {
  id: string
  email: string
  reason: string | null
  category: string | null
  user_agent: string | null
  ip_address: string | null
  unsubscribed_at: string
}

function formatDate(isoDate: string | null) {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function EmailUnsubscribesPage() {
  await requireAdmin('/email-unsubscribes')

  const supabase = await createClient()

  const { data: unsubscribes, error } = await supabase
    .from('email_unsubscribes')
    .select('*')
    .order('unsubscribed_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching email_unsubscribes:', error)
  }

  const total = unsubscribes?.length || 0
  const categories = (unsubscribes || []).reduce<Record<string, number>>((acc, u) => {
    const key = u.category || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">E-posta Çıkışları</h1>
        <p className="text-gray-600 mt-1">Abonelikten çıkan kullanıcıların kayıtları</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kayıt</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <MailX className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Yaygın Kategori</p>
              <p className="text-lg font-semibold">{topCategory || '-'}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Son Güncelleme</p>
              <p className="text-lg font-semibold">{formatDate(unsubscribes?.[0]?.unsubscribed_at || null)}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">E-posta</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Kategori</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sebep</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {unsubscribes && unsubscribes.length > 0 ? (
                (unsubscribes as EmailUnsubscribe[]).map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{row.email}</p>
                      {row.ip_address && (
                        <p className="text-xs text-gray-500 mt-1">IP: {row.ip_address}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{row.category || 'unknown'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{row.reason || '-'}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(row.unsubscribed_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Henüz çıkış kaydı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
