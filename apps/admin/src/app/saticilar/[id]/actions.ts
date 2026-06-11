'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

const TAXPAYER_TYPES = [
  'real_person',
  'sole_proprietor',
  'limited_company',
  'joint_stock_company',
  'tradesman_exempt',
  'simple_method',
  'second_hand',
] as const

const KDV_RATES = [0, 1, 8, 10, 18, 20] as const

export async function updateTaxInfo(
  storeId: string,
  input: { taxpayerType: string; kdvRate: number; taxNumber: string; taxOffice: string }
) {
  await requireAdmin('/saticilar')

  if (!TAXPAYER_TYPES.includes(input.taxpayerType as any)) {
    throw new Error('Geçersiz mükellef türü.')
  }
  if (!KDV_RATES.includes(input.kdvRate as any)) {
    throw new Error('Geçersiz KDV oranı.')
  }
  const taxNumber = input.taxNumber.trim()
  if (taxNumber && !/^\d{10,11}$/.test(taxNumber)) {
    throw new Error('VKN 10 hane, TCKN 11 hane olmalı.')
  }

  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      taxpayer_type: input.taxpayerType,
      kdv_rate: input.kdvRate,
      tax_number: taxNumber || null,
      tax_office: input.taxOffice.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
  if (error) throw new Error(error.message)

  revalidatePath(`/saticilar/${storeId}`)
}

export async function verifyExemption(storeId: string) {
  const { userId } = await requireAdmin('/saticilar')
  const supabase = createServiceRoleClient()

  // Belge olmadan muafiyet onaylanamaz
  const { data: store } = await (supabase as any)
    .from('stores')
    .select('tradesman_certificate_url, taxpayer_type')
    .eq('id', storeId)
    .single()
  if (!store?.tradesman_certificate_url) {
    throw new Error('Esnaf Vergi Muafiyeti Belgesi yüklenmeden onay verilemez.')
  }

  const { error } = await (supabase as any)
    .from('stores')
    .update({
      is_withholding_exempt: true,
      withholding_exempt_verified: true,
      withholding_exempt_verified_at: new Date().toISOString(),
      withholding_exempt_verified_by: userId,
      taxpayer_type: 'tradesman_exempt',
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
  if (error) throw new Error(error.message)

  revalidatePath(`/saticilar/${storeId}`)
}

export async function revokeExemption(storeId: string) {
  await requireAdmin('/saticilar')
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      is_withholding_exempt: false,
      withholding_exempt_verified: false,
      withholding_exempt_verified_at: null,
      withholding_exempt_verified_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
  if (error) throw new Error(error.message)

  revalidatePath(`/saticilar/${storeId}`)
}
