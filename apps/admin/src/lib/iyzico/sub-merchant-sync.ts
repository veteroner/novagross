// Mağaza bilgilerini iyzico'daki alt üye işyeri kayıt(lar)ına senkronize eder.
//
// iyzico'da kayıt bir kez açılır (tip: PERSONAL / PRIVATE_COMPANY /
// LIMITED_OR_JOINT_STOCK_COMPANY) ve sonradan mağaza bilgisi değişse de
// kendiliğinden güncellenmez. Para gönderimi IBAN sahibinin adıyla yapıldığı
// için ad/ünvan ile IBAN tutmazsa banka ödemeyi reddeder.
//
// Tip API ile değiştirilemez; bu modül kaydın mevcut tipine göre güncellenebilen
// alanları mağaza bilgileriyle eşitler. Şirket mağazasına ait BİREYSEL bir kayıtta
// (eski kayıtlar) iletişim adı/soyadı şirket ünvanı yapılır — gönderimde
// kullanılan ad banka hesabıyla eşleşsin diye.
//
// Senkronize edilen kayıtlar: stores.iyzico_sub_merchant_external_id (aktif) +
// stores.iyzico_legacy_sub_merchant_external_ids (eski, başarısız gönderimi
// olabilecek kayıtlar).

type ServiceClient = any

export type SubMerchantSyncResult = {
  externalId: string
  ok: boolean
  type?: string
  error?: string
}

const COMPANY_TAXPAYER_TYPES = ['limited_company', 'joint_stock_company']

function call(iyzipay: any, method: string, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    iyzipay.subMerchant[method](request, (err: any, res: any) => (err ? reject(err) : resolve(res)))
  })
}

async function getIyzipay() {
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  if (!apiKey || !secretKey) throw new Error('iyzico API kimlik bilgileri eksik.')
  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  return new Iyzipay({ apiKey, secretKey, uri: baseUrl })
}

/** "TEKNOVA ... LİMİTED ŞİRKETİ" → { name: "TEKNOVA ... LİMİTED", surname: "ŞİRKETİ" } */
function splitTitle(title: string): { name: string; surname: string } {
  const parts = title.trim().split(/\s+/)
  if (parts.length < 2) return { name: title.trim(), surname: title.trim() }
  return { name: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] }
}

function buildUpdate(store: any, current: any): Record<string, string | undefined> {
  const iban = String(store.iban || '').replace(/\s/g, '').toUpperCase()
  const phone = String(store.phone || '').replace(/\s/g, '')
  const address = [store.address, store.district, store.city].filter(Boolean).join(', ').trim()
  const title = String(store.account_holder || store.company_name || '').trim()
  const isCompanyStore = COMPANY_TAXPAYER_TYPES.includes(store.taxpayer_type)

  const base: Record<string, string | undefined> = {
    locale: 'tr',
    conversationId: `sync_${String(store.id).slice(0, 8)}_${Date.now()}`,
    subMerchantKey: current.subMerchantKey,
    name: store.store_name || current.name,
    email: store.email || current.email,
    gsmNumber: phone || current.gsmNumber,
    address: address || current.address,
    iban: /^TR\d{24}$/.test(iban) ? iban : current.iban,
    currency: current.currency || 'TRY',
  }

  if (current.subMerchantType === 'PERSONAL') {
    // Tip değişemez. Şirket mağazasıysa gönderim adı = şirket ünvanı olsun.
    const names = isCompanyStore && title
      ? splitTitle(title)
      : { name: current.contactName, surname: current.contactSurname }
    return {
      ...base,
      contactName: names.name,
      contactSurname: names.surname,
      identityNumber: current.identityNumber,
    }
  }

  // PRIVATE_COMPANY / LIMITED_OR_JOINT_STOCK_COMPANY
  return {
    ...base,
    legalCompanyTitle: title || current.legalCompanyTitle,
    taxOffice: store.tax_office || current.taxOffice,
    taxNumber: store.tax_number || current.taxNumber,
    ...(current.subMerchantType === 'PRIVATE_COMPANY' && { identityNumber: current.identityNumber }),
  }
}

export async function syncStoreSubMerchants(service: ServiceClient, storeId: string): Promise<SubMerchantSyncResult[]> {
  const { data: store, error } = await service
    .from('stores')
    .select(
      'id, store_name, taxpayer_type, tax_number, tax_office, company_name, account_holder, iban, email, phone, address, district, city, iyzico_sub_merchant_external_id, iyzico_legacy_sub_merchant_external_ids'
    )
    .eq('id', storeId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!store) throw new Error('Mağaza bulunamadı.')

  const externalIds: string[] = [
    store.iyzico_sub_merchant_external_id,
    ...((store.iyzico_legacy_sub_merchant_external_ids as string[] | null) ?? []),
  ].filter(Boolean)

  const results: SubMerchantSyncResult[] = []
  if (externalIds.length === 0) {
    await service
      .from('stores')
      .update({ iyzico_sync_needed: false, iyzico_sync_error: 'iyzico kaydı yok' } as any)
      .eq('id', storeId)
    return results
  }

  const iyzipay = await getIyzipay()

  for (const externalId of externalIds) {
    try {
      const current = await call(iyzipay, 'retrieve', {
        locale: 'tr',
        conversationId: `get_${String(store.id).slice(0, 8)}_${Date.now()}`,
        subMerchantExternalId: externalId,
      })
      if (current.status !== 'success') {
        results.push({ externalId, ok: false, error: current.errorMessage || current.errorCode })
        continue
      }
      const res = await call(iyzipay, 'update', buildUpdate(store, current))
      if (res.status === 'success') {
        results.push({ externalId, ok: true, type: current.subMerchantType })
      } else {
        results.push({ externalId, ok: false, type: current.subMerchantType, error: res.errorMessage || res.errorCode })
      }
    } catch (e: any) {
      results.push({ externalId, ok: false, error: e?.message || 'hata' })
    }
  }

  const failed = results.filter((r) => !r.ok)
  await service
    .from('stores')
    .update({
      iyzico_sync_needed: failed.length > 0,
      iyzico_synced_at: new Date().toISOString(),
      iyzico_sync_error: failed.length > 0 ? failed.map((f) => `${f.externalId}: ${f.error}`).join(' | ') : null,
    } as any)
    .eq('id', storeId)

  console.log('[iyzico sync]', storeId, JSON.stringify(results))
  return results
}
