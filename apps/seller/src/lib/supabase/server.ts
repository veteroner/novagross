import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createBearerClient, getBearerToken } from './bearer'
import type { Database } from '@novagross/database'

export async function createClient() {
  // Next.js 15: cookies() returns Promise<ReadonlyRequestCookies>
  // Mobil uygulama: Authorization: Bearer <access_token> → cookie yerine token oturumu
  const bearer = getBearerToken(await headers())
  if (bearer) {
    return createBearerClient(bearer) as unknown as ReturnType<typeof createServerClient<Database, 'public'>>
  }

  const cookieStore = await cookies()

  return createServerClient<Database, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore cookie write errors in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore cookie write errors in Server Components
          }
        },
      },
    }
  )
}
