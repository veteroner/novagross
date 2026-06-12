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

type StoreInfoInput = {
  store_name: string | null
  company_name: string | null
  commission_rate: number | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  district: string | null
  postal_code: string | null
  bank_name: string | null
  iban: string | null
  account_holder: string | null
}

export async function updateStoreInfo(storeId: string, input: StoreInfoInput) {
  await requireAdmin('/saticilar')

  // Validasyon
  if (!input.store_name || input.store_name.trim().length < 2) {
    throw new Error('Mağaza adı en az 2 karakter olmalı.')
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error('Geçersiz e-posta formatı.')
  }
  const iban = input.iban?.trim().toUpperCase().replace(/\s/g, '') || null
  if (iban && !/^TR\d{24}$/.test(iban)) {
    throw new Error('IBAN TR ile başlamalı ve 26 karakter olmalı (TR + 24 hane).')
  }
  const cr = input.commission_rate
  if (cr !== null && cr !== undefined && (!Number.isFinite(cr) || cr < 0 || cr > 50)) {
    throw new Error('Komisyon oranı 0–50 arasında olmalı.')
  }
  // TR cep telefonu: +90 ile veya 0 ile başlayıp 10 hane gelsin
  const phoneRaw = input.phone?.trim().replace(/\s/g, '') || null
  let phone: string | null = null
  if (phoneRaw) {
    const m = phoneRaw.match(/^(?:\+?90|0)?(\d{10})$/)
    if (!m) throw new Error('Telefon TR formatında olmalı (örn +905XXXXXXXXX, 10 hane).')
    phone = `+90${m[1]}`
  }
  const postalRaw = input.postal_code?.trim() || null
  if (postalRaw && !/^\d{5}$/.test(postalRaw)) {
    throw new Error('Posta kodu 5 haneli olmalı.')
  }

  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      store_name: input.store_name.trim(),
      company_name: input.company_name?.trim() || null,
      commission_rate: cr ?? null,
      email: input.email?.trim() || null,
      phone,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      district: input.district?.trim() || null,
      postal_code: postalRaw,
      bank_name: input.bank_name?.trim() || null,
      iban,
      account_holder: input.account_holder?.trim() || null,
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
