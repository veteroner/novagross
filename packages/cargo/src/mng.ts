/**
 * MNG Kargo API Client — GERÇEK gateway (api.mngkargo.com.tr / IBM API Connect)
 *
 * Auth: her istekte X-IBM-Client-Id + X-IBM-Client-Secret header.
 *       POST /mngapi/api/token { customerNumber, password, identityType } → JWT (Bearer).
 * Sipariş: Plus Command /createDetailedOrder
 * Takip:   Plus Query /getShipmentByBarcode/{barcode}
 * Barkod:  Barcode Command /createbarcode
 * Şehir/ilçe kodu: CBS Info /getcities, /getdistricts/{cityCode}
 *
 * Gerekli env:
 *   MNG_CLIENT_ID, MNG_CLIENT_SECRET           → X-IBM header (apizone uygulama anahtarları)
 *   MNG_CUSTOMER_NUMBER, MNG_CUSTOMER_PASSWORD → MNG kargo müşteri hesabı (token için)
 *   MNG_CUSTOMER_ID                            → shipper customerId (MNG müşteri no, integer)
 *   MNG_BASE_URL (ops, default https://api.mngkargo.com.tr)
 */

export interface MngShipmentRequest {
  senderName: string
  senderAddress: string
  senderCity: string
  senderDistrict: string
  senderPhone: string

  receiverName: string
  receiverAddress: string
  receiverCity: string
  receiverDistrict: string
  receiverPhone: string
  receiverEmail?: string

  weight: number
  pieceCount?: number
  paymentType: 'SENDER' | 'RECEIVER'
  serviceType?: 'STANDARD' | 'EXPRESS'

  description?: string
  invoiceNumber?: string
  invoiceValue?: number
  referenceNumber?: string
}

export interface MngShipmentResponse {
  success: boolean
  trackingNumber?: string
  barcode?: string
  labelUrl?: string
  error?: string
  errorCode?: string
}

export interface MngTrackingResponse {
  success: boolean
  trackingNumber: string
  status: string
  statusDescription: string
  currentLocation?: string
  history: Array<{ date: string; time?: string; location: string; status: string; description: string }>
  estimatedDelivery?: string
}

/** Bulk Query: toplu gönderi durumu satırı (ham MNG yanıtı) */
export interface MngBulkShipmentRow {
  shipment?: {
    referenceId?: string
    shipmentId?: string
    shipmentStatusCode?: number
    isDelivered?: number
    deliveryDate?: string
    deliveryTo?: string
    estimatedDeliveryDate?: string
    shipperBranch?: string
    receivingBranch?: string
    shipmentDateTime?: string
    [k: string]: any
  }
  [k: string]: any
}

type CodeRec = { code: number; name: string }

function trUpper(s: string): string {
  return (s || '').replace(/i/g, 'İ').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR').trim()
}

export class MngKargoClient {
  private clientId: string
  private clientSecret: string
  private customerNumber: string
  private customerPassword: string
  private customerId: number
  private baseUrl: string
  private tokenCache: { token: string; expiresAt: number } | null = null
  private cityCache: CodeRec[] | null = null
  private districtCache = new Map<number, CodeRec[]>()

  constructor() {
    this.clientId = process.env.MNG_CLIENT_ID || ''
    this.clientSecret = process.env.MNG_CLIENT_SECRET || ''
    this.customerNumber = process.env.MNG_CUSTOMER_NUMBER || ''
    this.customerPassword = process.env.MNG_CUSTOMER_PASSWORD || ''
    this.customerId = Number(process.env.MNG_CUSTOMER_ID || 0)
    this.baseUrl = process.env.MNG_BASE_URL || 'https://api.mngkargo.com.tr'
  }

  /** Entegrasyon için zorunlu kimlik bilgileri tam mı? */
  isConfigured(): { ok: boolean; missing: string[] } {
    const missing: string[] = []
    if (!this.clientId) missing.push('MNG_CLIENT_ID')
    if (!this.clientSecret) missing.push('MNG_CLIENT_SECRET')
    if (!this.customerNumber) missing.push('MNG_CUSTOMER_NUMBER')
    if (!this.customerPassword) missing.push('MNG_CUSTOMER_PASSWORD')
    if (!this.customerId) missing.push('MNG_CUSTOMER_ID')
    return { ok: missing.length === 0, missing }
  }

  private ibmHeaders(): Record<string, string> {
    return {
      'X-IBM-Client-Id': this.clientId,
      'X-IBM-Client-Secret': this.clientSecret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  private async getToken(): Promise<string | null> {
    const now = Date.now()
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) return this.tokenCache.token
    try {
      const res = await fetch(`${this.baseUrl}/mngapi/api/token`, {
        method: 'POST',
        headers: this.ibmHeaders(),
        body: JSON.stringify({
          customerNumber: this.customerNumber,
          password: this.customerPassword,
          identityType: 1,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        console.error('[mng] token error', res.status, text.slice(0, 300))
        return null
      }
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        data = { jwt: text }
      }
      const token = data.jwt || data.token || data.access_token || (typeof data === 'string' ? data : '')
      if (!token) {
        console.error('[mng] token response beklenmeyen biçim', text.slice(0, 200))
        return null
      }
      this.tokenCache = { token, expiresAt: now + 55 * 60 * 1000 }
      return token
    } catch (e) {
      console.error('[mng] token fetch error', e)
      return null
    }
  }

  private async authedFetch(path: string, init: RequestInit & { method: string }) {
    const token = await this.getToken()
    if (!token) throw new Error('MNG kimlik doğrulama başarısız (token alınamadı)')
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.ibmHeaders(), Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    })
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    return { ok: res.ok, status: res.status, data }
  }

  /** CBS Info: şehir adı → integer kod */
  private async resolveCityCode(cityName: string): Promise<number | null> {
    if (!this.cityCache) {
      const { ok, data } = await this.authedFetch('/mngapi/api/cbsinfoapi/getcities', { method: 'GET' })
      if (!ok || !Array.isArray(data)) return null
      this.cityCache = data.map((c: any) => ({ code: Number(c.code ?? c.cityCode ?? c.id), name: trUpper(c.name ?? c.cityName ?? '') }))
    }
    const target = trUpper(cityName)
    return this.cityCache.find((c) => c.name === target)?.code ?? null
  }

  /** CBS Info: ilçe adı → integer kod */
  private async resolveDistrictCode(cityCode: number, districtName: string): Promise<number | null> {
    let list = this.districtCache.get(cityCode)
    if (!list) {
      const { ok, data } = await this.authedFetch(`/mngapi/api/cbsinfoapi/getdistricts/${cityCode}`, { method: 'GET' })
      if (!ok || !Array.isArray(data)) return null
      list = data.map((d: any) => ({ code: Number(d.code ?? d.districtCode ?? d.id), name: trUpper(d.name ?? d.districtName ?? '') }))
      this.districtCache.set(cityCode, list)
    }
    const target = trUpper(districtName)
    return list.find((d) => d.name === target)?.code ?? null
  }

  async createShipment(data: MngShipmentRequest): Promise<MngShipmentResponse> {
    const cfg = this.isConfigured()
    if (!cfg.ok) {
      return { success: false, error: `MNG entegrasyonu için eksik ayar: ${cfg.missing.join(', ')}`, errorCode: 'NOT_CONFIGURED' }
    }
    try {
      const recvCityCode = await this.resolveCityCode(data.receiverCity)
      if (!recvCityCode) return { success: false, error: `Alıcı şehri MNG koduna çevrilemedi: ${data.receiverCity}`, errorCode: 'CITY_NOT_FOUND' }
      const recvDistrictCode = await this.resolveDistrictCode(recvCityCode, data.receiverDistrict)

      const reference = trUpper((data.referenceNumber || data.invoiceNumber || `NG${Date.now()}`).replace(/[^A-Za-z0-9]/g, ''))
      const kg = Math.max(1, Math.ceil(data.weight || 1))
      const desi = Math.max(1, Math.ceil((data.weight || 1) * 3))

      const payload = {
        order: {
          referenceId: reference,
          barcode: reference,
          isCOD: 0,
          codAmount: 0,
          shipmentServiceType: data.serviceType === 'EXPRESS' ? 7 : 1, // 1=STANDART, 7=GÜNİÇİ
          packagingType: 4, // KOLİ
          content: (data.description || 'Sipariş').slice(0, 50),
          smsPreference1: 1,
          smsPreference2: 1,
          smsPreference3: 0,
          paymentType: data.paymentType === 'RECEIVER' ? 2 : 1, // 1=GÖNDERİCİ, 2=ALICI
          deliveryType: 1, // ADRESE_TESLİM
          description: (data.description || '').slice(0, 100),
          // MNG bu alanları boş string ister (yoksa 26029 reddeder)
          marketPlaceShortCode: '',
          marketPlaceSaleCode: '',
          pudoId: '',
        },
        orderPieceList: Array.from({ length: data.pieceCount || 1 }, (_, i) => ({
          barcode: (data.pieceCount || 1) > 1 ? `${reference}-${i + 1}` : reference,
          desi,
          kg,
          content: (data.description || 'Sipariş').slice(0, 50),
        })),
        shipper: {
          customerId: this.customerId,
          // Fatura mutabakatında siparişi geri eşleştirmek için referansımız
          refCustomerId: reference,
        },
        recipient: {
          cityCode: recvCityCode,
          districtCode: recvDistrictCode ?? 0,
          address: data.receiverAddress,
          fullName: data.receiverName,
          mobilePhoneNumber: (data.receiverPhone || '').replace(/\D/g, ''),
          email: data.receiverEmail || '',
        },
      }

      const { ok, data: result } = await this.authedFetch('/mngapi/api/pluscmdapi/createDetailedOrder', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const errMsg = this.extractError(result)
      if (ok && !errMsg) {
        return { success: true, trackingNumber: reference, barcode: reference }
      }
      return { success: false, error: errMsg || 'MNG sipariş oluşturulamadı', errorCode: 'CREATE_FAILED' }
    } catch (e: any) {
      console.error('[mng] createShipment error', e)
      return { success: false, error: e.message || 'API bağlantı hatası' }
    }
  }

  /** Yazdırılabilir barkod (base64). createbarcode { referenceId, orderPieceList:[{barcode,desi,kg}] } ister. */
  async getBarcode(
    reference: string,
    pieces?: Array<{ barcode: string; desi: number; kg: number; content?: string }>
  ): Promise<{ success: boolean; barcodeBase64?: string; error?: string }> {
    if (!this.isConfigured().ok) return { success: false, error: 'MNG yapılandırılmamış' }
    try {
      const ref = trUpper(reference)
      const orderPieceList =
        pieces && pieces.length > 0 ? pieces : [{ barcode: ref, desi: 1, kg: 1, content: '' }]
      const { ok, data } = await this.authedFetch('/mngapi/api/barcodecmdapi/createbarcode', {
        method: 'POST',
        body: JSON.stringify({ referenceId: ref, orderPieceList }),
      })
      const b64 = (data && (data.barcode || data.barcodeData || data.base64 || data.content)) || (typeof data === 'string' ? data : null)
      if (ok && b64) return { success: true, barcodeBase64: b64 }
      return { success: false, error: this.extractError(data) || 'Barkod alınamadı' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async trackShipment(barcode: string): Promise<MngTrackingResponse> {
    try {
      const { ok, data } = await this.authedFetch(
        `/mngapi/api/plusqueryapi/getShipmentByBarcode/${encodeURIComponent(trUpper(barcode))}`,
        { method: 'GET' }
      )
      if (ok && data && !this.extractError(data)) {
        const rec = Array.isArray(data) ? data[0] : data
        const movements: any[] = rec?.movements || rec?.history || rec?.shipmentMovements || []
        return {
          success: true,
          trackingNumber: barcode,
          status: rec?.statusCode || rec?.status || 'unknown',
          statusDescription: rec?.statusDescription || rec?.status || '',
          currentLocation: rec?.currentLocation || rec?.lastBranch,
          estimatedDelivery: rec?.estimatedDelivery,
          history: movements.map((m: any) => ({
            date: m.date || m.eventDate || '',
            time: m.time || m.eventTime,
            location: m.location || m.branchName || '',
            status: m.status || m.eventCode || '',
            description: m.description || m.eventDescription || '',
          })),
        }
      }
      return { success: false, trackingNumber: barcode, status: 'error', statusDescription: this.extractError(data) || 'Takip bilgisi alınamadı', history: [] }
    } catch (e: any) {
      return { success: false, trackingNumber: barcode, status: 'error', statusDescription: e.message || 'API bağlantı hatası', history: [] }
    }
  }

  async cancelShipment(barcode: string): Promise<{ success: boolean; message: string }> {
    try {
      const { ok, data } = await this.authedFetch('/mngapi/api/pluscmdapi/cancelOrderDelivery', {
        method: 'POST',
        body: JSON.stringify({ referenceId: trUpper(barcode), description: 'Sipariş iptali' }),
      })
      const err = this.extractError(data)
      return { success: ok && !err, message: err || (ok ? 'Kargo iptal edildi' : 'İptal başarısız') }
    } catch (e: any) {
      return { success: false, message: e.message || 'API bağlantı hatası' }
    }
  }

  /**
   * Bulk Query: belirli bir tarih/saatten sonra DURUMU DEĞİŞEN tüm gönderiler.
   * Format: dd-MM-yyyy ve HH:mm:ss (MNG örnek formatı). Günlük senkronizasyon için kullanılır.
   */
  async getStatusChangedShipments(date: string, time: string): Promise<MngBulkShipmentRow[]> {
    const { ok, data } = await this.authedFetch(
      `/mngapi/api/bulkqueryapi/getStatusChangedShipments/${encodeURIComponent(date)}/${encodeURIComponent(time)}`,
      { method: 'GET' }
    )
    if (!ok || !Array.isArray(data)) return []
    return data
  }

  /** Bulk Query: belirli tarihte teslim edilmiş tüm gönderiler */
  async getDeliveredShipments(date: string): Promise<MngBulkShipmentRow[]> {
    const { ok, data } = await this.authedFetch(
      `/mngapi/api/bulkqueryapi/getDeliveredShipment/${encodeURIComponent(date)}`,
      { method: 'GET' }
    )
    if (!ok || !Array.isArray(data)) return []
    return data
  }

  /** Finance Query: tarih aralığındaki faturalar */
  async getInvoiceList(startDate: string, endDate: string): Promise<any[]> {
    const { ok, data } = await this.authedFetch('/mngapi/api/financequeryapi/getinvoicelist', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    })
    if (!ok || !Array.isArray(data)) return []
    return data
  }

  /** Finance Query: bir faturanın gönderi bazında detayları (finalTotal = gerçek kargo ücreti) */
  async getInvoiceDetailList(invoice: {
    invoiceNumber?: string
    invoiceSerialNumber?: string
    eInvoiceId?: string
    invoiceType?: number
  }): Promise<any[]> {
    const { ok, data } = await this.authedFetch('/mngapi/api/financequeryapi/getinvoicedetaillist', {
      method: 'POST',
      body: JSON.stringify({
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceSerialNumber: invoice.invoiceSerialNumber || '',
        eInvoiceId: invoice.eInvoiceId || '',
        invoiceType: invoice.invoiceType ?? 1,
      }),
    })
    if (!ok || !Array.isArray(data)) return []
    return data
  }

  /** MNG yanıtından hata mesajı çıkar (ProblemDetails / array / message alanları) */
  private extractError(data: any): string | null {
    if (!data) return null
    if (typeof data === 'string') return /error|hata|invalid|fail/i.test(data) ? data.slice(0, 200) : null
    if (data.errors || data.errorCode || data.isSuccess === false || data.success === false || (typeof data.status === 'number' && data.status >= 400)) {
      return String(data.detail || data.errorMessage || data.title || data.message || 'İşlem başarısız')
    }
    if (Array.isArray(data)) {
      const failed = data.find((r: any) => r && (r.isSuccess === false || r.success === false || r.errorMessage))
      if (failed) return String(failed.errorMessage || failed.message || 'İşlem başarısız')
    }
    return null
  }
}

export const mngKargo = new MngKargoClient()
