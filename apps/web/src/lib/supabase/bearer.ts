import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@novagross/database'

// Mobil uygulamalar cookie yerine `Authorization: Bearer <supabase access_token>`
// gönderir. Bu istemci RLS'i o kullanıcı adına çalıştırır (auth.uid() = token sahibi).
// apps/seller/src/lib/supabase/bearer.ts ile aynı — değişiklikte ikisini de güncelle.

export function getBearerToken(headers: Headers): string | null {
  const auth = headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim()
  // Supabase access token'ı bir JWT'dir (3 parça). Cron secret gibi diğer
  // Bearer değerleri burada kullanıcı oturumu sayılmasın.
  return token && token.split('.').length === 3 ? token : null
}

export function createBearerClient(token: string) {
  const client = createSupabaseClient<Database, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  )
  // Route'lar `supabase.auth.getUser()` çağırıyor; oturum saklanmadığı için
  // token'ı açıkça geçir (Supabase Auth sunucusunda doğrulanır).
  const getUser = client.auth.getUser.bind(client.auth)
  ;(client.auth as any).getUser = (jwt?: string) => getUser(jwt ?? token)
  return client
}
