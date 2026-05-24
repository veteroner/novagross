import { Card } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { MessageSquare } from 'lucide-react'

export default async function ReviewsPage() {
  await requireAdmin('/yorumlar')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yorumlar</h1>
        <p className="text-gray-600 mt-1">Ürün ve mağaza yorumları</p>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Henüz Yorum Yok</h3>
          <p className="text-gray-600 mb-4">
            Ürün yorumları sistemi veritabanına eklendiğinde buradan yönetebileceksiniz.
          </p>
          <div className="max-w-md mx-auto text-left bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">💡 Yorum Özellikleri (Planlanan):</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>5 yıldızlı değerlendirme sistemi</li>
              <li>Fotoğraf ve video desteği</li>
              <li>Onay/Red/Moderasyon</li>
              <li>Spam filtreleme</li>
              <li>Satıcı yanıtları</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
