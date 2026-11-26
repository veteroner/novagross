import type { UnifiedShipmentRequest, UnifiedTrackingResponse } from './index'
import { normalizeTrCityDistrict } from './tr-address'

type JsonObject = Record<string, unknown>

function record(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function field(data: JsonObject, name: string): unknown {
  return Object.entries(data).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
}

function str(value: unknown): string {
  return typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value)) ? String(value).trim() : ''
}

function phone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^(90(?=\d{10}$)|0(?=\d{10}$))/, '')
  if (!/^[1-9]\d{9}$/.test(digits)) throw new Error('Kolay Gelsin için geçerli bir telefon numarası gerekli.')
  return digits
}

function required(value: string, max: number, label: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) throw new Error(`Kolay Gelsin: ${label} en fazla ${max} karakter olmalı ve boş bırakılamaz.`)
  return trimmed
}

/**
 * Doküman: hatalı isteklerde ExceptionMessage (ör. "Receiver District Id is Not Correct.")
 * döner. Satıcının sorunu düzeltebilmesi için kısa, tek satırlık hali mesaja eklenir.
 */
const MESSAGE_KEYS = ['exceptionMessage', 'message', 'errorMessage', 'resultMessage', 'error', 'errors', 'description', 'title', 'detail']

/** Yanıtta (iç içe result/errors dahil) ilk anlamlı hata metnini bulur. */
export function findMessage(value: unknown, depth = 0): string {
  if (depth > 3 || value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) { const m = findMessage(item, depth + 1); if (m) return m }
    return ''
  }
  const obj = record(value)
  for (const key of MESSAGE_KEYS) {
    const m = findMessage(field(obj, key), depth + 1)
    if (m) return m
  }
  return findMessage(field(obj, 'result') ?? field(obj, 'data'), depth + 1)
}

/** Hata yanıtını loglamak için: kimlik bilgisi/token taşıyabilecek alanlar maskelenir. */
export function redactedBody(text: string) {
  return text.replace(/("(?:[^"]*(?:token|sifre|password|secret)[^"]*)"\s*:\s*)"[^"]*"/gi, '$1"***"').slice(0, 800)
}

/**
 * LoginAES yanıtındaki Bearer token'ı bulur (result string/obje ya da üst seviye).
 * Canlı servis HTTP 200 + StatusCode 200 + dolu Token ile birlikte IsSuccessful=false
 * döndürüyor; Kolay Gelsin desteği token dönmesini başarılı giriş sayıyor.
 */
export function loginToken(raw: unknown): string {
  const result = field(record(raw), 'result')
  const candidates = [result, raw].flatMap(source => typeof source === 'string'
    ? [source]
    : [field(record(source), 'token'), field(record(source), 'accessToken'), field(record(source), 'access_token')])
  // Hata metni token sanılmasın: boşluksuz ve en az 20 karakter.
  return candidates.map(str).find(token => /^[^\s]{20,}$/.test(token)) ?? ''
}

/**
 * Kolay Gelsin etiketinde (^PW800) üstteki Code128 referans barkodu x=50'de başlar,
 * sağındaki metin/logo x=520'de. `NG-<sipariş uuid>` gibi uzun referanslar ^BY2 ile
 * ~930 nokta genişliğe çıkıp metin ve logonun üstüne biner. Barkod modül genişliği,
 * barkod 470 noktaya sığacak şekilde (en az 1) küçültülür; diğer alanlara dokunulmaz.
 */
export function fitKolayGelsinLabel(zpl: string): string {
  return zpl.replace(/\^FO(\d+),(\d+),?\^BY(\d+)(,[^^]*)?\^BC([^^]*)\^FD([^^]*)\^FS/, (match, x, y, module, rest, bc, data) => {
    const available = 520 - Number(x) - 5
    const modules = 11 * String(data).length + 35 // Code128: karakter başı 11 + start/check/stop
    const fitted = Math.max(1, Math.min(Number(module), Math.floor(available / modules)))
    return fitted === Number(module) ? match : `^FO${x},${y},^BY${fitted}${rest ?? ''}^BC${bc}^FD${data}^FS`
  })
}

function stepName(path: string) {
  if (path.includes('/Token/')) return 'giriş'
  if (path.includes('GetCityDistricts')) return 'il/ilçe sorgusu'
  if (path.includes('SETDELIVERY')) return 'iş emri oluşturma'
  if (path.includes('TRACKDELIVERY')) return 'takip'
  if (path.includes('CANCELDELIVERY')) return 'iptal'
  if (path.includes('GETBARCODE')) return 'etiket'
  return 'istek'
}

function carrierMessage(envelope: JsonObject, text: string) {
  const message = findMessage(envelope) ||
    (Object.keys(envelope).length === 0 && !/[<{]/.test(text) ? text.trim() : '')
  const clean = message.replace(/[\r\n\t]+/g, ' ').replace(/[^\p{L}\p{N} .,:;'()/_-]/gu, '').trim().slice(0, 200)
  return clean ? `: ${clean}` : ''
}

function trackingLink(value: unknown) {
  try {
    const url = new URL(str(value))
    if (url.protocol === 'https:' && !url.username && !url.password &&
      (url.hostname === 'kolaygelsin.com' || url.hostname.endsWith('.kolaygelsin.com') ||
       url.hostname === 'sendeo.com.tr' || url.hostname.endsWith('.sendeo.com.tr'))) return url.href
  } catch { /* Carrier may not yet have generated a tracking URL. */ }
}

function status(code: number) {
  if (code === 111) return 'delivered'
  if (code === 109 || code === 140) return 'out_for_delivery'
  if (code === 133 || code === 139) return 'cancelled'
  if (code === 151) return 'returned'
  if (code === 101 || code === 102) return 'preparing'
  if (code >= 103 && code <= 108 || code === 138) return 'in_transit'
  return 'unknown'
}

const nameKey = (value: unknown) =>
  str(value).replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim()

/**
 * GetCityDistricts yanıt şekli dokümanda tanımlı değil. Desteklenen biçimler:
 *   { cityId, districts: [{ districtId, districtName }] }
 *   [{ cityId, districts: [...] }]  veya  [{ cityId, districtId, districtName }]
 * Birden fazla ilçe dönerse yalnızca adı birebir eşleşen kabul edilir.
 */
export function pickDistrict(raw: unknown, districtName: string) {
  const target = nameKey(districtName)
  const candidates: Array<{ cityId: number; districtId: number; name: string }> = []
  for (const item of Array.isArray(raw) ? raw : [raw]) {
    const row = record(item)
    const cityId = Number(field(row, 'cityId'))
    const nested = field(row, 'districts')
    const rows = Array.isArray(nested) ? nested.map(record) : [row]
    for (const d of rows) {
      candidates.push({
        cityId: Number(field(d, 'cityId') ?? cityId),
        districtId: Number(field(d, 'districtId')),
        name: nameKey(field(d, 'districtName') ?? field(d, 'name')),
      })
    }
  }
  const valid = candidates.filter(c => Number.isSafeInteger(c.cityId) && c.cityId > 0 && Number.isSafeInteger(c.districtId) && c.districtId > 0)
  const exact = valid.filter(c => c.name && c.name === target)
  const match = exact.length === 1 ? exact[0] : valid.length === 1 ? valid[0] : undefined
  return { cityId: match?.cityId ?? 0, districtId: match?.districtId ?? 0 }
}

export function isKolayGelsinEnabledForStore(storeId: string | null | undefined) {
  return Boolean(storeId && storeId === process.env.KOLAY_GELSIN_STORE_ID &&
    process.env.KOLAY_GELSIN_API_URL && process.env.KOLAY_GELSIN_API_USERNAME && process.env.KOLAY_GELSIN_API_PASSWORD)
}

export class KolayGelsinClient {
  /** unconfirmed: LoginAES IsSuccessful=false ile token döndürdü (servis teyidi yok). */
  private token?: { value: string; expiresAt: number; unconfirmed: boolean }
  private unconfirmedLogin = false
  private login?: Promise<string>

  private async request(path: string, options: { token?: string; body?: JsonObject; acceptToken?: boolean } = {}) {
    const base = process.env.KOLAY_GELSIN_API_URL
    if (!base) throw new Error('Kolay Gelsin API adresi yapılandırılmamış.')
    const origin = new URL(base)
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port ||
        !['apiintg.kolaygelsin.com', 'apiintg-preprod.klyglsn.com', 'apiintg-dev.klyglsn.com'].includes(origin.hostname)) {
      throw new Error('Kolay Gelsin API adresi geçersiz.')
    }

    const response = await fetch(new URL(path, origin), {
      method: options.body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const text = await response.text()
    let raw: unknown = text
    try { raw = text ? JSON.parse(text) : null } catch { /* düz metin hata gövdesi */ }
    const envelope = record(raw)
    const step = stepName(path)
    if (!response.ok) {
      console.error(`[kolaygelsin] ${step} HTTP ${response.status}:`, redactedBody(text))
      const error = new Error(`Kolay Gelsin ${step} başarısız (HTTP ${response.status})${carrierMessage(envelope, text)}.`)
      ;(error as Error & { status?: number }).status = response.status
      throw error
    }
    const statusRejected = Number(field(envelope, 'statusCode') || 200) >= 400
    if (field(envelope, 'isSuccess') === false || field(envelope, 'isSuccessful') === false || statusRejected) {
      if (options.acceptToken && !statusRejected && !str(field(envelope, 'exceptionMessage')) && loginToken(raw)) {
        // Kesin ret değil, servis anomalisi: token önce salt okunur il/ilçe sorgusunda denenir.
        console.warn(`[kolaygelsin] ${step}: IsSuccessful=false ama token döndü; doğrulanmamış token kullanılıyor.`)
        this.unconfirmedLogin = true
        return raw
      }
      console.error(`[kolaygelsin] ${step} reddedildi:`, redactedBody(text))
      throw new Error(`Kolay Gelsin ${step} isteğini kabul etmedi${carrierMessage(envelope, text)}.`)
    }
    return field(envelope, 'result') ?? raw
  }

  private async getToken() {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value
    if (!this.login) {
      this.login = (async () => {
        const musteri = process.env.KOLAY_GELSIN_API_USERNAME
        const sifre = process.env.KOLAY_GELSIN_API_PASSWORD
        if (!musteri || !sifre) throw new Error('Kolay Gelsin API kullanıcısı yapılandırılmamış.')
        this.unconfirmedLogin = false
        const result = await this.request('/api/Token/LoginAES', { body: { musteri, sifre }, acceptToken: true })
        const token = typeof result === 'string' ? result.trim() : loginToken(result)
        if (!token || /\s/.test(token)) throw new Error('Kolay Gelsin giriş belirteci alınamadı.')
        this.token = { value: token, expiresAt: Date.now() + 19 * 60 * 60 * 1000, unconfirmed: this.unconfirmedLogin }
        return token
      })().finally(() => { this.login = undefined })
    }
    return this.login
  }

  private async cargoRaw(path: string, body?: JsonObject) {
    try {
      return await this.request(`/api/Cargo/${path}`, { token: await this.getToken(), body })
    } catch (error) {
      // Token 20 saatten önce geçersizleşebilir (ör. şifre değişti) — bir kez yenile.
      if ((error as { status?: number }).status !== 401) throw error
      const unconfirmed = this.token?.unconfirmed
      this.token = undefined
      // Doğrulanmamış token reddedildiyse yeniden giriş deneme (her giriş doğrulama/blok tetikleyebilir).
      if (unconfirmed) throw new Error('Kolay Gelsin girişi belirsiz: giriş IsSuccessful=false ile token döndürdü, token il/ilçe sorgusunda reddedildi (HTTP 401). Kolay Gelsin desteğine iletin.')
      return await this.request(`/api/Cargo/${path}`, { token: await this.getToken(), body })
    }
  }

  private async cargo(path: string, body?: JsonObject) {
    return record(await this.cargoRaw(path, body))
  }

  private async district(city: string, district: string) {
    const normalized = normalizeTrCityDistrict(city, district)
    if (!normalized.city || !normalized.district) throw new Error('Kolay Gelsin için il ve ilçe gerekli.')
    const query = new URLSearchParams({ CityName: normalized.city, DistrictName: normalized.district })
    const raw = await this.cargoRaw(`GetCityDistricts?${query}`)
    const { cityId, districtId } = pickDistrict(raw, normalized.district)
    if (!Number.isSafeInteger(cityId) || cityId < 1 || !Number.isSafeInteger(districtId) || districtId < 1) {
      throw new Error('Kolay Gelsin ilçe kodunu doğrulayamadı. Teslimat adresini kontrol edin.')
    }
    return { cityId, districtId }
  }

  async createShipment(data: UnifiedShipmentRequest, claimDispatch?: () => Promise<boolean>) {
    const reference = data.referenceNumber || ''
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(reference)) throw new Error('Kolay Gelsin için benzersiz sipariş referansı gerekli.')
    if (data.paymentType !== 'SENDER' || data.serviceType !== 'STANDARD') throw new Error('Kolay Gelsin için standart, gönderici ödemeli taşıma destekleniyor.')
    const count = data.pieceCount ?? 1
    if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error('Geçerli paket adedi gerekli.')
    const receiver = required(data.receiverName, 200, 'alıcı adı')
    const address = required(data.receiverAddress, 225, 'teslimat adresi')
    const receiverPhone = phone(data.receiverPhone)
    const destination = await this.district(data.receiverCity, data.receiverDistrict)
    if (claimDispatch && !await claimDispatch()) {
      const existing = await this.cargo('GETBARCODE', { referenceNo: reference, barcodeLabelType: 2, barcodeVersion: 'V2' })
        .catch(() => { throw new Error('Kolay Gelsin iş emri daha önce istendi. Yeni iş emri açmadan önce bu siparişin referansını portalda kontrol edin.') })
      return this.shipmentResult(existing)
    }

    const result = await this.cargo('SETDELIVERY', {
      DeliveryType: 1,
      ReferenceNo: reference,
      Receiver: receiver,
      ReceiverAddress: address,
      ReceiverCityId: destination.cityId,
      ReceiverDistrictId: destination.districtId,
      ReceiverPhone: receiverPhone,
      PaymentType: 1,
      CollectionType: 0,
      CollectionPrice: 0,
      ServiceType: 1,
      BarcodeLabelType: 2,
      BarcodeVersion: 'V2',
      Products: [{ Count: count, ProductCode: '', Description: '', Deci: 0 }],
    })
    return this.shipmentResult(result)
  }

  private shipmentResult(result: JsonObject) {
    const trackingNumber = str(field(result, 'trackingNumber') ?? field(result, 'trackingNo'))
    if (!/^\d{4,32}$/.test(trackingNumber)) throw new Error('Kolay Gelsin takip numarası dönmedi. Tekrar denemeden önce iş emrini portalda kontrol edin.')
    return {
      success: true,
      trackingNumber,
      trackingUrl: trackingLink(field(result, 'trackingUrl')),
      zpl: str(field(result, 'barcodeZpl')) || undefined,
      officialBarcode: str(field(result, 'barcodeNumbers')) || undefined,
    }
  }

  async getBarcode(trackingNumber: string, referenceNo?: string) {
    if (!referenceNo) {
      const tracking = await this.cargo(`TRACKDELIVERY?${new URLSearchParams({ trackingNumber })}`)
      referenceNo = str(field(tracking, 'referenceNo'))
    }
    if (!referenceNo) throw new Error('Kolay Gelsin gönderi referansı bulunamadı.')
    const result = await this.cargo('GETBARCODE', { referenceNo, barcodeLabelType: 2, barcodeVersion: 'V2' })
    const zpl = str(field(result, 'barcodeZpl'))
    if (str(field(result, 'trackingNumber')) !== trackingNumber) {
      throw new Error('Kolay Gelsin etiketi bu siparişin takip numarasıyla eşleşmedi.')
    }
    return { success: Boolean(zpl), zpl: zpl || undefined, officialBarcode: str(field(result, 'barcodeNumbers')) || undefined }
  }

  async trackShipment(trackingNumber: string, referenceNo?: string): Promise<UnifiedTrackingResponse> {
    const query = new URLSearchParams(referenceNo ? { referenceNo } : { trackingNumber })
    const result = await this.cargo(`TRACKDELIVERY?${query}`)
    if (referenceNo && str(field(result, 'trackingNo') ?? field(result, 'trackingNumber')) !== trackingNumber) {
      throw new Error('Kolay Gelsin takip numarası bu siparişle eşleşmedi.')
    }
    const code = Number(field(result, 'state'))
    const entries = field(result, 'statusHistories')
    return {
      success: Number.isFinite(code) && code > 0,
      provider: 'kolaygelsin',
      trackingNumber,
      status: status(code),
      statusDescription: str(field(result, 'stateText')) || 'Gönderi durumu alınamadı',
      estimatedDelivery: str(field(result, 'deliveryPlannedDate')) || undefined,
      history: Array.isArray(entries) ? entries.map(entry => {
        const row = record(entry)
        return { date: str(field(row, 'statusDate')), location: '', status: status(Number(field(row, 'statusId'))), description: str(field(row, 'description') ?? field(row, 'status')) }
      }) : [],
    }
  }

  async cancelShipment(trackingNumber: string, referenceNo?: string) {
    const query = new URLSearchParams(referenceNo ? { referenceNo } : { trackingNumber })
    const result = await this.cargo(`CANCELDELIVERY?${query}`, {})
    const success = field(result, 'isSuccess') === true
    return { success, message: success ? 'Kolay Gelsin iş emri iptal edildi.' : 'Kolay Gelsin iptali doğrulamadı.' }
  }
}

export const kolayGelsin = new KolayGelsinClient()
