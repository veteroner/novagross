import Link from 'next/link'
import { Card, Badge, PageHeader } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ArrowLeft, Eye, Mail, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Mirror of EmailTemplate union in lib/email/types.ts
const TEMPLATES = [
  { key: 'auth/password-reset', group: 'Auth', label: 'Şifre Sıfırlama' },
  { key: 'auth/password-changed', group: 'Auth', label: 'Şifre Değişti' },
  { key: 'auth/email-verification', group: 'Auth', label: 'E-posta Doğrulama' },
  { key: 'auth/otp-code', group: 'Auth', label: 'OTP Kodu' },
  { key: 'auth/new-device', group: 'Auth', label: 'Yeni Cihaz Girişi' },
  { key: 'auth/suspicious-activity', group: 'Auth', label: 'Şüpheli Aktivite' },

  { key: 'orders/order-confirmation', group: 'Siparişler', label: 'Sipariş Onayı' },
  { key: 'orders/order-shipped', group: 'Siparişler', label: 'Kargoya Verildi' },
  { key: 'orders/order-delivered', group: 'Siparişler', label: 'Teslim Edildi' },
  { key: 'orders/order-cancelled', group: 'Siparişler', label: 'Sipariş İptali' },
  { key: 'orders/new-order-seller', group: 'Siparişler', label: 'Yeni Sipariş (Satıcı)' },
  { key: 'orders/order-reminder-seller', group: 'Siparişler', label: 'Sipariş Hatırlatma (Satıcı)' },
  { key: 'orders/return-request', group: 'Siparişler', label: 'İade Talebi' },

  { key: 'finance/payment-received', group: 'Finans', label: 'Ödeme Alındı' },
  { key: 'finance/withdrawal-request', group: 'Finans', label: 'Para Çekme Talebi' },
  { key: 'finance/withdrawal-approved', group: 'Finans', label: 'Para Çekme Onaylandı' },
  { key: 'finance/withdrawal-completed', group: 'Finans', label: 'Para Çekme Tamamlandı' },
  { key: 'finance/withdrawal-rejected', group: 'Finans', label: 'Para Çekme Reddi' },

  { key: 'products/product-approved', group: 'Ürünler', label: 'Ürün Onayı' },
  { key: 'products/product-rejected', group: 'Ürünler', label: 'Ürün Reddi' },
  { key: 'products/stock-alert', group: 'Ürünler', label: 'Stok Uyarısı' },
  { key: 'products/stock-empty', group: 'Ürünler', label: 'Stok Bitti' },
  { key: 'products/new-product-admin', group: 'Ürünler', label: 'Yeni Ürün (Admin)' },

  { key: 'marketing/welcome', group: 'Pazarlama', label: 'Hoş Geldin' },
  { key: 'marketing/welcome-series', group: 'Pazarlama', label: 'Hoş Geldin Serisi' },
  { key: 'marketing/campaign', group: 'Pazarlama', label: 'Kampanya' },
  { key: 'marketing/birthday', group: 'Pazarlama', label: 'Doğum Günü' },
  { key: 'marketing/abandoned-cart', group: 'Pazarlama', label: 'Terk Edilen Sepet' },
  { key: 'marketing/wishlist-discount', group: 'Pazarlama', label: 'İstek Listesi İndirimi' },
  { key: 'marketing/recommendations', group: 'Pazarlama', label: 'Öneriler' },
  { key: 'marketing/product-recommendations', group: 'Pazarlama', label: 'Ürün Önerileri' },
  { key: 'marketing/review-request', group: 'Pazarlama', label: 'Yorum İsteği' },
  { key: 'marketing/win-back', group: 'Pazarlama', label: 'Geri Kazanım' },

  { key: 'seller/application-received', group: 'Satıcı', label: 'Başvuru Alındı' },
  { key: 'seller/application-approved', group: 'Satıcı', label: 'Başvuru Onaylandı' },
  { key: 'seller/application-rejected', group: 'Satıcı', label: 'Başvuru Reddedildi' },
  { key: 'seller/withdrawal-processed', group: 'Satıcı', label: 'Çekim İşlendi' },
  { key: 'seller/weekly-payout-processed', group: 'Satıcı', label: 'Haftalık Ödeme İşlendi' },

  { key: 'store/product-approved', group: 'Mağaza', label: 'Mağaza Ürün Onayı' },
  { key: 'store/product-rejected', group: 'Mağaza', label: 'Mağaza Ürün Reddi' },
  { key: 'store/new-order', group: 'Mağaza', label: 'Yeni Sipariş' },

  { key: 'admin/critical-error', group: 'Admin', label: 'Kritik Hata' },
  { key: 'admin/payment-error', group: 'Admin', label: 'Ödeme Hatası' },
  { key: 'admin/daily-report', group: 'Admin', label: 'Günlük Rapor' },
  { key: 'admin/weekly-report', group: 'Admin', label: 'Haftalık Rapor' },
  { key: 'admin/weekly-payout-summary', group: 'Admin', label: 'Haftalık Ödeme Özeti' },
  { key: 'admin/pending-withdrawals', group: 'Admin', label: 'Bekleyen Çekimler' },
  { key: 'admin/suspicious-activity', group: 'Admin', label: 'Şüpheli Aktivite' },
  { key: 'admin/maintenance', group: 'Admin', label: 'Bakım' },
  { key: 'admin/new-seller-application', group: 'Admin', label: 'Yeni Satıcı Başvurusu' },
] as const

export default async function EmailTemplatesPage() {
  const { supabase } = await requireAdmin('/ayarlar/email-sablonlari')

  // Pull last-30-days send counts per template (best effort)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('email_logs')
    .select('template, status')
    .gte('created_at', since)
    .limit(20000)

  const stats = new Map<string, { sent: number; failed: number; opened: number }>()
  for (const log of logs ?? []) {
    const key = (log as any).template
    if (!key) continue
    const s = stats.get(key) ?? { sent: 0, failed: 0, opened: 0 }
    if ((log as any).status === 'failed' || (log as any).status === 'bounced') s.failed++
    else if ((log as any).status === 'opened' || (log as any).status === 'clicked') s.opened++
    else s.sent++
    stats.set(key, s)
  }

  const grouped = TEMPLATES.reduce<Record<string, typeof TEMPLATES[number][]>>((acc, t) => {
    ;(acc[t.group] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ayarlar"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Ayarlara Dön
        </Link>
      </div>

      <PageHeader
        title="E-posta Şablonları"
        description={`${TEMPLATES.length} şablon · Son 30 günün gönderim metrikleri`}
        actions={
          <Link
            href="/email-templates-analytics"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <BarChart3 className="h-4 w-4" />
            Detaylı Analitik →
          </Link>
        }
      />

      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group} className="overflow-hidden">
          <div className="px-6 py-3 border-b bg-gray-50 font-semibold text-gray-700">
            {group}{' '}
            <Badge variant="secondary" className="ml-2">
              {items.length}
            </Badge>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="text-left py-2 px-4 font-medium">Şablon</th>
                <th className="text-left py-2 px-4 font-medium">Anahtar</th>
                <th className="text-right py-2 px-4 font-medium">Gönderim</th>
                <th className="text-right py-2 px-4 font-medium">Açılma</th>
                <th className="text-right py-2 px-4 font-medium">Hata</th>
                <th className="text-right py-2 px-4 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const s = stats.get(t.key)
                return (
                  <tr key={t.key} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        {t.label}
                      </div>
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-gray-500">{t.key}</td>
                    <td className="py-2 px-4 text-right">{s?.sent ?? 0}</td>
                    <td className="py-2 px-4 text-right">{s?.opened ?? 0}</td>
                    <td className="py-2 px-4 text-right">
                      {s?.failed ? (
                        <span className="text-red-600">{s.failed}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <a
                        href={`/api/email/preview?template=${encodeURIComponent(t.key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        <Eye className="h-3 w-3" />
                        Önizle
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      ))}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Not:</strong> Şablonlar kod tabanlı React Email componentlardır. İçerik
          değişikliği için <code className="bg-blue-100 px-1 rounded">apps/admin/src/lib/email/templates/</code>{' '}
          altındaki dosyaları düzenleyin.
        </p>
      </Card>
    </div>
  )
}
