import { Card, Badge, Button } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Mail, Phone, Clock, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ContactMessage = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: string
  created_at: string | null
  replied_at: string | null
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

export default async function IletisimMesajlariPage() {
  await requireAdmin('/iletisim-mesajlari')

  const supabase = await createClient()

  // Fetch contact messages
  const { data: messages, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contact messages:', error)
  }

  // Calculate stats
  const totalMessages = messages?.length || 0
  const newMessages = messages?.filter(m => m.status === 'new').length || 0
  const repliedMessages = messages?.filter(m => m.status === 'replied').length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">İletişim Mesajları</h1>
        <p className="text-gray-600 mt-1">Müşteri mesajlarını görüntüleyin ve yanıtlayın</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Mesaj</p>
              <p className="text-2xl font-bold">{totalMessages}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Yeni</p>
              <p className="text-2xl font-bold text-orange-600">{newMessages}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Yanıtlandı</p>
              <p className="text-2xl font-bold text-green-600">{repliedMessages}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">İsim</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">İletişim</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Konu</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Mesaj</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Durum</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {messages && messages.length > 0 ? (
                messages.map((message) => (
                  <tr key={message.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium">{message.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{message.email}</span>
                        </div>
                        {message.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{message.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{message.subject}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {message.status === 'new' ? (
                        <Badge variant="default">Yeni</Badge>
                      ) : message.status === 'replied' ? (
                        <Badge variant="success">Yanıtlandı</Badge>
                      ) : (
                        <Badge variant="secondary">{message.status}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(message.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        Görüntüle
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Henüz mesaj bulunmuyor
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
