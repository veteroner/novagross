import { supabase } from './supabase'

// novagross.com API'leri (ödeme başlatma vb. sunucu tarafı iş mantığı).
// Mobil cookie taşımaz → Authorization: Bearer <access_token> (apps/web lib/supabase/bearer.ts).
const BASE = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://novagross.com'
export const WEB_URL = BASE

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function webApi<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError('Oturum bulunamadı, tekrar giriş yapın.', 401)
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-client': 'mobile' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(json?.error || `İstek başarısız (${res.status})`, res.status)
  return json as T
}

/** PDF gibi ikili yanıtlar (ör. /api/invoices/:id) */
export async function webApiBinary(path: string): Promise<ArrayBuffer> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError('Oturum bulunamadı, tekrar giriş yapın.', 401)
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, 'x-client': 'mobile' } })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new ApiError(json?.error || `İstek başarısız (${res.status})`, res.status)
  }
  return res.arrayBuffer()
}
