import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@novagross/database'

let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient<Database, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'nova-store-admin'
        }
      }
    }
  )

  return browserClient
}
