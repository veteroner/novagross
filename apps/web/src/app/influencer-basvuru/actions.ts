'use server'

import { createClient } from '@/lib/supabase/server'

export type InfluencerApplicationInput = {
  name: string
  email: string
  phone: string | null
  social_platform: string
  social_handle: string
  follower_count: number | null
  bio: string | null
}

function generateRefCode(name: string): string {
  // Slugify + random suffix
  const base = name
    .toLowerCase()
    .replace(/[ğ]/g, 'g')
    .replace(/[ç]/g, 'c')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base || 'inf'}${rand}`
}

export async function submitInfluencerApplication(
  input: InfluencerApplicationInput
) {
  const supabase = await createClient()

  if (!input.name || input.name.trim().length < 3) {
    throw new Error('Ad Soyad en az 3 karakter olmalı.')
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error('Geçerli bir e-posta girin.')
  }
  if (!input.social_handle) {
    throw new Error('Sosyal medya kullanıcı adı zorunludur.')
  }

  // Email tekrar mı kontrol et
  const { data: existing } = await (supabase as any)
    .from('influencers')
    .select('id')
    .eq('email', input.email.toLowerCase().trim())
    .maybeSingle()
  if (existing) {
    throw new Error('Bu e-posta ile zaten başvuru var.')
  }

  // Auth varsa user_id'yi de yakala
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unique ref_code üret (kollizyon riskine karşı 3 deneme)
  let refCode = ''
  for (let i = 0; i < 3; i++) {
    refCode = generateRefCode(input.name)
    const { data: existing } = await (supabase as any)
      .from('influencers')
      .select('id')
      .eq('ref_code', refCode)
      .maybeSingle()
    if (!existing) break
  }

  const { error } = await (supabase as any).from('influencers').insert({
    user_id: user?.id ?? null,
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    phone: input.phone,
    social_platform: input.social_platform,
    social_handle: input.social_handle.trim(),
    follower_count: input.follower_count,
    bio: input.bio,
    ref_code: refCode,
    commission_percent: 5.00,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
}
