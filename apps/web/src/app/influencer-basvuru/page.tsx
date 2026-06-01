import { Sparkles, Users, Wallet, TrendingUp } from 'lucide-react'
import { ApplyForm } from './apply-form'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Influencer Programı — Novagross',
  description: 'Sosyal medya içeriklerinizden satış komisyonu kazanın.',
}

export default function InfluencerApplyPage() {
  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold mb-3">
          <Sparkles className="h-3 w-3" />
          NOVAGROSS INFLUENCER PROGRAMI
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          İçeriklerinizden satış komisyonu kazanın
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Size özel link ile gelen her satıştan komisyon kazanın. Yayılma sınırınız yok,
          ödemeleriniz IBAN'ınıza her ay yapılır.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="border rounded-lg p-5 bg-white">
          <Users className="h-6 w-6 text-pink-600 mb-2" />
          <h3 className="font-semibold mb-1">Kolay başvuru</h3>
          <p className="text-sm text-gray-600">
            Form doldurun. Onayınız sonrasında size özel link üretilir.
          </p>
        </div>
        <div className="border rounded-lg p-5 bg-white">
          <TrendingUp className="h-6 w-6 text-pink-600 mb-2" />
          <h3 className="font-semibold mb-1">%5 komisyon</h3>
          <p className="text-sm text-gray-600">
            Linkinizle gelen her satıştan otomatik komisyon kazanın.
          </p>
        </div>
        <div className="border rounded-lg p-5 bg-white">
          <Wallet className="h-6 w-6 text-pink-600 mb-2" />
          <h3 className="font-semibold mb-1">Aylık ödeme</h3>
          <p className="text-sm text-gray-600">
            Kazandıklarınız 30 günlük doğrulama süreci sonrasında IBAN'ınıza gönderilir.
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Başvuru Formu</h2>
        <ApplyForm />
      </div>
    </div>
  )
}
