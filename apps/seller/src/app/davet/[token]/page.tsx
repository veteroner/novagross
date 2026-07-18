import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Mağaza daveti kabul sayfası. Giriş yoksa login'e yönlendirir; girişliyse
// accept_store_invitation RPC'siyle üyeliği oluşturur (token+e-posta eşleşince).
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string }
}) {
  const { token } = await (params as any)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/davet/${token}`)}`)
  }

  const { data, error } = await (supabase as any).rpc('accept_store_invitation', { p_token: token })
  const result = (data || {}) as { ok?: boolean; error?: string }

  const ok = !error && result.ok
  const reason = result.error || (error ? 'server_error' : 'unknown')
  const messages: Record<string, string> = {
    invalid_or_expired: 'Bu davet geçersiz ya da süresi dolmuş.',
    email_mismatch: 'Bu davet farklı bir e-posta adresine gönderilmiş. Lütfen davetin gönderildiği hesapla giriş yapın.',
    auth_required: 'Devam etmek için giriş yapmalısınız.',
    server_error: 'Bir hata oluştu, lütfen tekrar deneyin.',
    unknown: 'Davet işlenemedi.',
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        {ok ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <h1 className="mb-2 text-2xl font-bold">Davet kabul edildi</h1>
            <p className="mb-6 text-gray-600">
              Mağazaya <b>{result && (result as any).role === 'manager' ? 'Yönetici' : 'Personel'}</b> olarak
              eklendiniz. Artık satıcı panelini kullanabilirsiniz.
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg px-5 py-2.5 font-medium text-white"
              style={{ backgroundColor: '#16A34A' }}
            >
              Panele Git
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
              ✕
            </div>
            <h1 className="mb-2 text-2xl font-bold">Davet işlenemedi</h1>
            <p className="mb-6 text-gray-600">{messages[reason] || messages.unknown}</p>
            <Link href="/" className="inline-block rounded-lg border px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
              Ana Sayfa
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
