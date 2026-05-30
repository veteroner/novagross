import Link from 'next/link'
import { Card, Badge, PageHeader, StatCard } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Key,
  KeyRound,
  UserCog,
  Users,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SecuritySettingsPage() {
  const { supabase } = await requireAdmin('/ayarlar/guvenlik')

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Admins & super_admins (snapshot from profiles)
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, updated_at')
    .in('role', ['admin', 'super_admin'])
    .order('updated_at', { ascending: false })
    .limit(50)

  const [
    { count: pwResetsLast24h },
    { count: pwResetsLast7d },
    { count: pwResetsUnused },
    { count: otpLast24h },
    { count: otpVerifiedLast24h },
    { count: contactNew },
    { count: verificationsPending },
  ] = await Promise.all([
    supabase
      .from('password_reset_tokens')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
    supabase
      .from('password_reset_tokens')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since7d),
    supabase
      .from('password_reset_tokens')
      .select('id', { count: 'exact', head: true })
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
    supabase
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h)
      .not('verified_at', 'is', null),
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    // email_verifications may not be in generated types; cast `from` defensively
    (supabase.from as any)('email_verifications')
      .select('id', { count: 'exact', head: true })
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .then(
        (res: any) => res,
        () => ({ count: null })
      ) as Promise<{ count: number | null }>,
  ])

  const otpVerificationRate =
    otpLast24h && otpLast24h > 0
      ? Math.round(((otpVerifiedLast24h ?? 0) / otpLast24h) * 100)
      : null

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
        title="Güvenlik"
        description="Yetki, kimlik doğrulama ve uyarı sinyalleri"
      />

      {/* Health summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Admin Sayısı"
          value={admins?.length ?? 0}
          icon={UserCog}
          iconColor="text-blue-500"
        />
        <StatCard
          label="Şifre Sıfırlama (24s)"
          value={pwResetsLast24h ?? 0}
          hint={`son 7 gün: ${pwResetsLast7d ?? 0}`}
          icon={KeyRound}
          iconColor="text-orange-500"
        />
        <StatCard
          label="OTP Doğrulama (24s)"
          value={
            <>
              {otpVerifiedLast24h ?? 0}
              <span className="text-sm text-gray-500"> / {otpLast24h ?? 0}</span>
            </>
          }
          hint={otpVerificationRate !== null ? `%${otpVerificationRate} oran` : 'veri yok'}
          icon={Key}
          iconColor="text-green-500"
        />
      </div>

      {/* Alerts */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          Uyarı Sinyalleri
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-gray-700">Aktif (kullanılmamış) şifre sıfırlama tokenı</span>
            {(pwResetsUnused ?? 0) > 0 ? (
              <Badge className="bg-orange-500">{pwResetsUnused}</Badge>
            ) : (
              <Badge variant="outline">Yok</Badge>
            )}
          </li>
          <li className="flex items-center justify-between">
            <span className="text-gray-700">Bekleyen e-posta doğrulaması</span>
            {(verificationsPending ?? 0) > 0 ? (
              <Badge variant="secondary">{verificationsPending}</Badge>
            ) : (
              <Badge variant="outline">Yok</Badge>
            )}
          </li>
          <li className="flex items-center justify-between">
            <span className="text-gray-700">Yeni iletişim mesajları</span>
            {(contactNew ?? 0) > 0 ? (
              <Link href="/iletisim-mesajlari">
                <Badge className="bg-orange-500 cursor-pointer">{contactNew}</Badge>
              </Link>
            ) : (
              <Badge variant="outline">Yok</Badge>
            )}
          </li>
        </ul>
      </Card>

      {/* Admins */}
      <Card>
        <div className="px-6 py-3 border-b bg-gray-50 font-semibold text-gray-700 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Admin Hesapları
        </div>
        {!admins || admins.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">Admin hesabı yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="text-left py-2 px-4 font-medium">Ad</th>
                <th className="text-left py-2 px-4 font-medium">E-posta</th>
                <th className="text-left py-2 px-4 font-medium">Rol</th>
                <th className="text-left py-2 px-4 font-medium">Son güncelleme</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a: any) => {
                const name =
                  [a.first_name, a.last_name].filter(Boolean).join(' ') || 'İsimsiz'
                return (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{name}</td>
                    <td className="py-2 px-4 text-gray-700">{a.email}</td>
                    <td className="py-2 px-4">
                      {a.role === 'super_admin' ? (
                        <Badge className="bg-purple-600">Süper Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-600">{formatDate(a.updated_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900 space-y-2">
            <p>
              <strong>Güvenlik notları:</strong>
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Admin paneline yalnızca <code>role IN (admin, super_admin)</code> olan kullanıcılar erişebilir.</li>
              <li>Tüm tablolar Supabase RLS politikaları ile korunuyor.</li>
              <li>Şifre sıfırlama tokenları tek kullanımlık ve sınırlı sürelidir.</li>
              <li>Yeni admin eklemek için Supabase üzerinden ilgili profil <code>role</code>'unu güncelleyin.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
