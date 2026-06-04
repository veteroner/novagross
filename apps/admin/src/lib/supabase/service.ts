import { createClient } from '@supabase/supabase-js';
import type { Database } from '@novagross/database';

// SECURITY: service_role key RLS'i tamamen bypass eder. Bu modül ASLA client'ta
// çalışmamalı. Yanlışlıkla bir client component'ten import edilirse net hata ver.
if (typeof window !== 'undefined') {
  throw new Error(
    'service.ts yalnizca server tarafinda kullanilabilir (service_role key client\'a sizdirilamaz)'
  );
}


export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
