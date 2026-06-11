'use server'

import { revalidatePath } from 'next/cache'
import { requireSeller } from '@/lib/auth/requireSeller'
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

export async function updateSellerTaxInfo(input: {
  taxpayerType: string
  kdvRate: number
  taxNumber: string
  taxOffice: string
}) {
  const { storeId } = await requireSeller('/vergi')

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

  const service = createServiceRoleClient()

  // Mükellef türü değişirse muafiyet onayı sıfırlanır (admin yeniden doğrulamalı)
  const { data: current } = await (service as any)
    .from('stores')
    .select('taxpayer_type, withholding_exempt_verified')
    .eq('id', storeId)
    .single()

  const typeChanged = current?.taxpayer_type !== input.taxpayerType
  const update: Record<string, any> = {
    taxpayer_type: input.taxpayerType,
    kdv_rate: input.kdvRate,
    tax_number: taxNumber || null,
    tax_office: input.taxOffice.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (typeChanged && current?.withholding_exempt_verified) {
    update.withholding_exempt_verified = false
    update.withholding_exempt_verified_at = null
    update.withholding_exempt_verified_by = null
    update.is_withholding_exempt = false
  }
  // Esnaf muaflığı seçildiyse muafiyet TALEBİ açılır — onay her zaman adminde
  if (input.taxpayerType === 'tradesman_exempt') {
    update.is_withholding_exempt = true
    // verified bilinçli olarak DEĞİŞTİRİLMEZ (yeni talepse zaten false)
  }

  const { error } = await (service as any)
    .from('stores')
    .update(update)
    .eq('id', storeId)
  if (error) throw new Error(error.message)

  revalidatePath('/vergi')
}

export async function saveCertificatePath(path: string) {
  const { storeId } = await requireSeller('/vergi')

  // Yol kendi mağaza klasörü altında olmalı (path traversal / başkasının dosyası engeli)
  if (!path.startsWith(`${storeId}/`) || path.includes('..')) {
    throw new Error('Geçersiz dosya yolu.')
  }

  const service = createServiceRoleClient()
  const { error } = await (service as any)
    .from('stores')
    .update({
      tradesman_certificate_url: path,
      // Yeni belge yüklendi → mevcut onay geçersiz, admin yeniden incelemeli
      withholding_exempt_verified: false,
      withholding_exempt_verified_at: null,
      withholding_exempt_verified_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
  if (error) throw new Error(error.message)

  revalidatePath('/vergi')
}
