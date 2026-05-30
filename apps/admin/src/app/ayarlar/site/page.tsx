import Link from 'next/link'
import { Card, Badge, PageHeader, StatCard } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Globe,
  Mail,
  CreditCard,
  Database,
  Truck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type EnvCheck = {
  key: string
  label: string
  required: boolean
  group: string
  icon: typeof Globe
}

const ENV_CHECKS: EnvCheck[] = [
  // Site
  { key: 'NEXT_PUBLIC_SITE_URL', label: 'Site URL', required: true, group: 'Site', icon: Globe },
  { key: 'NEXT_PUBLIC_ADMIN_URL', label: 'Admin URL', required: true, group: 'Site', icon: Server },
  { key: 'NEXT_PUBLIC_SELLER_URL', label: 'Satıcı URL', required: false, group: 'Site', icon: Server },

  // Supabase
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', required: true, group: 'Veritabanı', icon: Database },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', required: true, group: 'Veritabanı', icon: Database },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role', required: true, group: 'Veritabanı', icon: Database },

  // Email
  { key: 'RESEND_API_KEY', label: 'Resend API Key', required: true, group: 'E-posta', icon: Mail },
  { key: 'EMAIL_FROM', label: 'Gönderen Adresi', required: true, group: 'E-posta', icon: Mail },
  { key: 'ADMIN_EMAIL', label: 'Admin Bildirim Adresi', required: false, group: 'E-posta', icon: Mail },

  // Payment (Iyzico)
  { key: 'IYZICO_API_KEY', label: 'Iyzico API Key', required: false, group: 'Ödeme', icon: CreditCard },
  { key: 'IYZICO_SECRET_KEY', label: 'Iyzico Secret', required: false, group: 'Ödeme', icon: CreditCard },
  { key: 'IYZICO_BASE_URL', label: 'Iyzico Base URL', required: false, group: 'Ödeme', icon: CreditCard },

  // Cargo / shipping
  { key: 'CARGO_PROVIDER', label: 'Kargo Sağlayıcı', required: false, group: 'Kargo', icon: Truck },
]

function checkEnv(check: EnvCheck) {
  const raw = process.env[check.key]
  const set = Boolean(raw && raw.trim().length > 0)
  return { set, value: raw }
}

function maskValue(key: string, value: string | undefined) {
  if (!value) return null
  // Public URLs / non-secret keys → show full
  if (key.startsWith('NEXT_PUBLIC_') && !key.includes('KEY')) return value
  if (key === 'EMAIL_FROM' || key === 'ADMIN_EMAIL' || key === 'CARGO_PROVIDER' || key === 'IYZICO_BASE_URL') {
    return value
  }
  // Secret-like: keep first 4 + last 4 chars
  if (value.length <= 10) return '••••'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export default async function SiteSettingsPage() {
  const { supabase } = await requireAdmin('/ayarlar/site')

  // DB health checks
  const [{ count: profileCount }, { count: productCount }, { count: orderCount }, { count: storeCount }] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('stores').select('id', { count: 'exact', head: true }),
    ])

  const grouped = ENV_CHECKS.reduce<Record<string, EnvCheck[]>>((acc, c) => {
    ;(acc[c.group] ??= []).push(c)
    return acc
  }, {})

  const missingRequired = ENV_CHECKS.filter((c) => c.required && !checkEnv(c).set)

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
        title="Site Ayarları"
        description="Ortam değişkenleri ve sistem durumu"
      />

      {missingRequired.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">
                {missingRequired.length} zorunlu değişken eksik
              </p>
              <p className="text-sm text-red-800 mt-1">
                {missingRequired.map((c) => c.key).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Müşteri" value={profileCount ?? 0} />
        <StatCard label="Ürün" value={productCount ?? 0} />
        <StatCard label="Sipariş" value={orderCount ?? 0} />
        <StatCard label="Mağaza" value={storeCount ?? 0} />
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group}>
          <div className="px-6 py-3 border-b bg-gray-50 font-semibold text-gray-700">
            {group}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="text-left py-2 px-4 font-medium">Değişken</th>
                <th className="text-left py-2 px-4 font-medium">Değer</th>
                <th className="text-center py-2 px-4 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const { set, value } = checkEnv(c)
                const Icon = c.icon
                return (
                  <tr key={c.key} className="border-b">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-gray-400" />
                        <div>
                          <div className="font-medium">{c.label}</div>
                          <div className="font-mono text-xs text-gray-500">{c.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4 font-mono text-xs">
                      {set ? maskValue(c.key, value) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {set ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">Set</span>
                        </span>
                      ) : c.required ? (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          <span className="text-xs">Eksik</span>
                        </span>
                      ) : (
                        <Badge variant="outline">İsteğe bağlı</Badge>
                      )}
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
          <strong>Not:</strong> Değerler ortam değişkenlerinden (env) okunur ve gizli olanlar
          maskelenir. Değiştirmek için deployment ortamında <code className="bg-blue-100 px-1 rounded">.env</code>{' '}
          dosyasını güncelleyin ve yeniden başlatın.
        </p>
      </Card>
    </div>
  )
}
