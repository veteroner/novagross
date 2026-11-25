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

export function isKolayGelsinEnabledForStore(storeId: string | null | undefined) {
  return Boolean(storeId && storeId === process.env.KOLAY_GELSIN_STORE_ID &&
    process.env.KOLAY_GELSIN_API_URL && process.env.KOLAY_GELSIN_API_USERNAME && process.env.KOLAY_GELSIN_API_PASSWORD)
}

export class KolayGelsinClient {
  private token?: { value: string; expiresAt: number }
  private login?: Promise<string>

  private async request(path: string, options: { token?: string; body?: JsonObject } = {}) {
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
    if (!response.ok) throw new Error(`Kolay Gelsin isteği başarısız (HTTP ${response.status}).`)

    const raw: unknown = await response.json()
    const envelope = record(raw)
    if (field(envelope, 'isSuccess') === false || field(envelope, 'isSuccessful') === false || Number(field(envelope, 'statusCode') || 200) >= 400) {
      throw new Error('Kolay Gelsin isteği kabul etmedi. İşlemi kurumsal portalda kontrol edin.')
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
        const result = await this.request('/api/Token/LoginAES', { body: { musteri, sifre } })
        const token = typeof result === 'string' ? result : str(field(record(result), 'token') ?? field(record(result), 'accessToken') ?? field(record(result), 'access_token'))
        if (!token || /\s/.test(token)) throw new Error('Kolay Gelsin giriş belirteci alınamadı.')
        this.token = { value: token, expiresAt: Date.now() + 19 * 60 * 60 * 1000 }
        return token
      })().finally(() => { this.login = undefined })
    }
    return this.login
  }

  private async cargo(path: string, body?: JsonObject) {
    return record(await this.request(`/api/Cargo/${path}`, { token: await this.getToken(), body }))
  }

  private async district(city: string, district: string) {
    const normalized = normalizeTrCityDistrict(city, district)
    if (!normalized.city || !normalized.district) throw new Error('Kolay Gelsin için il ve ilçe gerekli.')
    const query = new URLSearchParams({ CityName: normalized.city, DistrictName: normalized.district })
    const result = await this.cargo(`GetCityDistricts?${query}`)
    const districts = field(result, 'districts')
    const cityId = Number(field(result, 'cityId'))
    const districtId = Number(Array.isArray(districts) && districts.length === 1 ? field(record(districts[0]), 'districtId') : 0)
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
