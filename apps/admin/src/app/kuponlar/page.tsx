import { Card, Button } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { Plus, Percent } from 'lucide-react'

export default async function CouponsPage() {
  await requireAdmin('/kuponlar')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kuponlar</h1>
          <p className="text-gray-600 mt-1">Kupon ve kampanya yönetimi</p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kupon
        </Button>
      </div>

      <Card className="p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Percent className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Henüz Kupon Yok</h3>
          <p className="text-gray-600 mb-4">
            Kupon sistemi veritabanına eklendiğinde buradan yönetebileceksiniz.
          </p>
          <div className="max-w-md mx-auto text-left bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">💡 Kupon Özellikleri (Planlanan):</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Yüzde veya sabit tutar indirimi</li>
              <li>Minimum sipariş tutarı</li>
              <li>Kullanım limiti ve tarihi</li>
              <li>Belirli kategorilere özel</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
