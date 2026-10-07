import { supabase } from './supabase'

// seller.novagross.com API'leri (kargo oluşturma, etiket vb. sunucu tarafı iş mantığı).
// Mobil cookie taşımaz → Authorization: Bearer <access_token> (apps/seller lib/supabase/bearer.ts).
const BASE = process.env.EXPO_PUBLIC_SELLER_API_URL || 'https://seller.novagross.com'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

/** İkili yanıt (ör. kargo etiketi PNG) */
export async function sellerApiBinary(path: string): Promise<ArrayBuffer> {
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

export async function sellerApi<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError('Oturum bulunamadı, tekrar giriş yapın.', 401)

  const res = await fetch(`${BASE}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-client': 'mobile',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(json?.error || `İstek başarısız (${res.status})`, res.status)
  return json as T
}
