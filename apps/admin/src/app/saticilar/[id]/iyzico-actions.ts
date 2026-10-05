'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { syncStoreSubMerchants, type SubMerchantSyncResult } from '@/lib/iyzico/sub-merchant-sync'

// iyzico alt üye işyeri (sub-merchant) kaydı.
//
// Para gönderimi IBAN sahibinin adıyla yapılır: banka, gönderimdeki ad ile hesap
// sahibi tutmazsa EFT'yi reddeder ("Para Gönderimi Tamamlanamadı"). Bu yüzden
// şirket hesabına giden ödemeler LIMITED_OR_JOINT_STOCK_COMPANY tipinde ve
// legalCompanyTitle = bankadaki hesap sahibi adı ile kaydedilmelidir.
// iyzico mevcut bir kaydın tipini güncellemeye izin vermez → yeni kayıt açılır.

const COMPANY_TAXPAYER_TYPES = ['limited_company', 'joint_stock_company']

export type IyzicoSubMerchantPreview = {
  ok: boolean
  errors: string[]
  currentKey: string | null
  request: Record<string, string> | null
}

async function loadStore(storeId: string) {
  const supabase = createServiceRoleClient()
  const { data: store, error } = await (supabase as any)
    .from('stores')
    .select(
      'id, store_name, taxpayer_type, tax_number, tax_office, company_name, account_holder, iban, email, phone, address, district, city, iyzico_sub_merchant_key, iyzico_sub_merchant_external_id, iyzico_legacy_sub_merchant_external_ids'
    )
    .eq('id', storeId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!store) throw new Error('Mağaza bulunamadı.')
  return store as any
}

function buildRequest(store: any): { errors: string[]; request: Record<string, string> | null } {
  const errors: string[] = []

  if (!COMPANY_TAXPAYER_TYPES.includes(store.taxpayer_type)) {
    errors.push('Mükellef türü Limited veya Anonim şirket olmalı (diğer türler için kayıt henüz desteklenmiyor).')
  }

  // Banka hesabı sahibinin adı ile birebir aynı olmalı — önce account_holder.
  const legalCompanyTitle = String(store.account_holder || store.company_name || '').trim()
  if (!legalCompanyTitle) errors.push('Hesap sahibi / şirket ünvanı boş.')

  const taxNumber = String(store.tax_number || '').trim()
  if (!/^\d{10}$/.test(taxNumber)) errors.push('VKN 10 hane olmalı.')

  const taxOffice = String(store.tax_office || '').trim()
  if (!taxOffice) errors.push('Vergi dairesi boş.')

  const iban = String(store.iban || '').replace(/\s/g, '').toUpperCase()
  if (!/^TR\d{24}$/.test(iban)) errors.push('IBAN geçersiz (TR + 24 hane).')

  const email = String(store.email || '').trim()
  if (!email.includes('@')) errors.push('E-posta boş veya geçersiz.')

  const gsmNumber = String(store.phone || '').replace(/\s/g, '')
  if (!/^\+?\d{10,13}$/.test(gsmNumber)) errors.push('Telefon boş veya geçersiz.')

  const address = [store.address, store.district, store.city].filter(Boolean).join(', ').trim()
  if (!address) errors.push('Adres boş.')

  if (errors.length > 0) return { errors, request: null }

  // subMerchantExternalId iyzico'da benzersiz olmalı; eski kayıt mağaza id'sini
  // kullandığı için yeniden kayıtta sonek eklenir.
  const subMerchantExternalId = store.iyzico_sub_merchant_key
    ? `${store.id}-${Date.now().toString(36)}`
    : store.id

  return {
    errors,
    request: {
      locale: 'tr',
      conversationId: `reg_${String(store.id).slice(0, 8)}_${Date.now()}`,
      subMerchantExternalId,
      subMerchantType: 'LIMITED_OR_JOINT_STOCK_COMPANY',
      name: store.store_name,
      legalCompanyTitle,
      taxOffice,
      taxNumber,
      iban,
      email,
      gsmNumber: gsmNumber.startsWith('+') ? gsmNumber : `+90${gsmNumber.replace(/^0/, '')}`,
      address,
      currency: 'TRY',
    },
  }
}

export async function previewIyzicoSubMerchant(storeId: string): Promise<IyzicoSubMerchantPreview> {
  await requireAdmin('/saticilar')
  const store = await loadStore(storeId)
  const { errors, request } = buildRequest(store)
  return { ok: errors.length === 0, errors, currentKey: store.iyzico_sub_merchant_key ?? null, request }
}

export async function registerIyzicoSubMerchant(storeId: string) {
  await requireAdmin('/saticilar')

  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  if (!apiKey || !secretKey) throw new Error('iyzico API kimlik bilgileri eksik.')

  const store = await loadStore(storeId)
  const { errors, request } = buildRequest(store)
  if (!request) throw new Error(errors.join(' '))

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  const result = await new Promise<any>((resolve, reject) => {
    iyzipay.subMerchant.create(request, (err: any, res: any) => (err ? reject(err) : resolve(res)))
  })

  if (result.status !== 'success' || !result.subMerchantKey) {
    console.error('[iyzico SubMerchant] create failed:', {
      storeId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    })
    throw new Error(`iyzico: ${result.errorMessage || 'kayıt başarısız'} (${result.errorCode ?? '-'})`)
  }

  const previousKey = store.iyzico_sub_merchant_key ?? null
  // Eski kayıtlar (register-sub-merchants.js) dış no olarak mağaza id'sini kullanıyordu
  const previousExternalId = previousKey ? store.iyzico_sub_merchant_external_id || store.id : null
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      iyzico_sub_merchant_key: result.subMerchantKey,
      iyzico_sub_merchant_external_id: request.subMerchantExternalId,
      // Eski kayıt senkronizasyonda güncellenmeye devam eder (başarısız gönderimler için)
      iyzico_legacy_sub_merchant_external_ids: previousExternalId
        ? Array.from(new Set([...(store.iyzico_legacy_sub_merchant_external_ids ?? []), previousExternalId]))
        : store.iyzico_legacy_sub_merchant_external_ids ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
  if (error) {
    // Kayıt iyzico'da açıldı ama DB'ye yazılamadı — anahtarı kaybetmemek için mesajda döndür.
    throw new Error(`iyzico kaydı açıldı (anahtar: ${result.subMerchantKey}) ama DB güncellenemedi: ${error.message}`)
  }

  console.log('[iyzico SubMerchant] registered:', { storeId, previousKey, newKey: result.subMerchantKey })
  revalidatePath(`/saticilar/${storeId}`)
  return { subMerchantKey: result.subMerchantKey as string, previousKey }
}

/** Mağaza bilgilerini iyzico'daki aktif + eski alt üye işyeri kayıtlarına gönderir. */
export async function syncIyzicoSubMerchants(storeId: string): Promise<SubMerchantSyncResult[]> {
  await requireAdmin('/saticilar')
  const results = await syncStoreSubMerchants(createServiceRoleClient(), storeId)
  revalidatePath(`/saticilar/${storeId}`)
  return results
}
