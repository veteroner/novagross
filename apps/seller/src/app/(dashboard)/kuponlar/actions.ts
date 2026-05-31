'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'

export type CouponInput = {
  code: string
  description?: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  minimum_amount?: number | null
  maximum_discount?: number | null
  usage_limit?: number | null
  starts_at?: string | null
  expires_at?: string | null
  is_active: boolean
  free_shipping?: boolean
}

function normalize(code: string) {
  return code.trim().toUpperCase()
}

function validate(input: CouponInput) {
  if (!input.code || input.code.trim().length < 2) throw new Error('Kupon kodu en az 2 karakter olmalı.')
  if (!['percentage', 'fixed'].includes(input.discount_type)) throw new Error('Geçersiz indirim tipi.')
  if (!Number.isFinite(input.discount_value) || input.discount_value <= 0)
    throw new Error("İndirim değeri 0'dan büyük olmalı.")
  if (input.discount_type === 'percentage' && input.discount_value > 100)
    throw new Error("Yüzde indirim 100'den büyük olamaz.")
}

function toRow(input: CouponInput, userId: string) {
  return {
    code: normalize(input.code),
    description: input.description?.trim() || null,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    minimum_amount: input.minimum_amount ?? null,
    maximum_discount: input.maximum_discount ?? null,
    usage_limit: input.usage_limit ?? null,
    starts_at: input.starts_at || null,
    expires_at: input.expires_at || null,
    is_active: input.is_active,
    free_shipping: input.free_shipping ?? false,
    created_by: userId,
    updated_at: new Date().toISOString(),
  }
}

export async function createCoupon(input: CouponInput) {
  validate(input)
  const { supabase, userId } = await requireSeller('/kuponlar')
  const { error } = await supabase.from('coupons').insert(toRow(input, userId) as any)
  if (error) {
    if ((error as any).code === '23505') throw new Error('Bu kupon kodu zaten kullanılıyor.')
    throw new Error(error.message)
  }
  revalidatePath('/kuponlar')
}

export async function updateCoupon(id: string, input: CouponInput) {
  validate(input)
  const { supabase, userId } = await requireSeller('/kuponlar')
  const row = toRow(input, userId)
  delete (row as any).created_by
  const { error } = await supabase.from('coupons').update(row as any).eq('id', id)
  if (error) {
    if ((error as any).code === '23505') throw new Error('Bu kupon kodu zaten kullanılıyor.')
    throw new Error(error.message)
  }
  revalidatePath('/kuponlar')
}

export async function toggleCouponActive(id: string, isActive: boolean) {
  const { supabase } = await requireSeller('/kuponlar')
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kuponlar')
}

export async function deleteCoupon(id: string) {
  const { supabase } = await requireSeller('/kuponlar')
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/kuponlar')
}
