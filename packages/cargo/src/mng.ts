/**
 * MNG Kargo (DHL eCommerce Apizone) Client
 * OAuth2 client_credentials + Plus Command / Plus Query / Barcode Command APIs
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

  // Sipariş referansı (marketplace order ID)
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
  history: Array<{
    date: string
    time?: string
    location: string
    status: string
    description: string
  }>
  estimatedDelivery?: string
}

export class MngKargoClient {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private tokenCache: { token: string; expiresAt: number } | null = null

  constructor() {
    this.clientId = process.env.MNG_CLIENT_ID!
    this.clientSecret = process.env.MNG_CLIENT_SECRET!
    this.baseUrl = process.env.MNG_BASE_URL || 'https://sandbox.mngkargo.com.tr'

    if (!this.clientId || !this.clientSecret) {
      console.warn('[mng] MNG_CLIENT_ID veya MNG_CLIENT_SECRET eksik')
    }
  }

  private async getToken(): Promise<string | null> {
    const now = Date.now()
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.token
    }
    try {
      const res = await fetch(`${this.baseUrl}/consumer-api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('[mng] token error', res.status, txt)
        return null
      }
      const data = await res.json()
      const token = data.access_token as string
      const expiresIn = (data.expires_in as number) || 3600
      this.tokenCache = { token, expiresAt: now + expiresIn * 1000 }
      return token
    } catch (e) {
      console.error('[mng] token fetch error', e)
      return null
    }
  }

  private async api(method: string, path: string, body?: unknown) {
    const token = await this.getToken()
    if (!token) throw new Error('MNG kimlik doğrulama başarısız')
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return { ok: res.ok, status: res.status, data: json }
    } catch {
      return { ok: res.ok, status: res.status, data: text }
    }
  }

  async createShipment(data: MngShipmentRequest): Promise<MngShipmentResponse> {
    try {
      const payload = {
        referenceNo: data.referenceNumber || data.invoiceNumber || '',
        sender: {
          name: data.senderName,
          address: data.senderAddress,
          city: data.senderCity,
          district: data.senderDistrict,
          phone: data.senderPhone,
        },
        receiver: {
          name: data.receiverName,
          address: data.receiverAddress,
          city: data.receiverCity,
          district: data.receiverDistrict,
          phone: data.receiverPhone,
          email: data.receiverEmail || '',
        },
        pieces: data.pieceCount || 1,
        weight: data.weight,
        paymentType: data.paymentType === 'RECEIVER' ? 'ALICI' : 'GONDEREN',
        serviceType: data.serviceType === 'EXPRESS' ? 'EXPRESS' : 'STANDART',
        description: data.description || '',
        invoiceNo: data.invoiceNumber || '',
        invoiceValue: data.invoiceValue || 0,
      }

      const { ok, data: result } = await this.api(
        'POST',
        '/consumer-api/plus-command/v1/order/marketplace',
        payload
      )

      if (ok && result?.trackingNo) {
        return {
          success: true,
          trackingNumber: result.trackingNo,
          barcode: result.barcode,
          labelUrl: result.labelUrl,
        }
      }

      return {
        success: false,
        error: result?.message || result?.errorDescription || 'Sipariş oluşturulamadı',
        errorCode: result?.errorCode,
      }
    } catch (e: any) {
      console.error('[mng] createShipment error', e)
      return { success: false, error: e.message || 'API bağlantı hatası' }
    }
  }

  async trackShipment(trackingNumber: string): Promise<MngTrackingResponse> {
    try {
      const { ok, data: result } = await this.api(
        'GET',
        `/consumer-api/plus-query/v1/order/status?trackingNo=${encodeURIComponent(trackingNumber)}`
      )

      if (ok && result?.status) {
        const movements: any[] = result.movements || result.history || []
        return {
          success: true,
          trackingNumber,
          status: result.status,
          statusDescription: result.statusDescription || result.status,
          currentLocation: result.currentLocation,
          estimatedDelivery: result.estimatedDelivery,
          history: movements.map((m: any) => ({
            date: m.date || m.eventDate || '',
            time: m.time || m.eventTime,
            location: m.location || m.branchName || '',
            status: m.status || m.eventCode || '',
            description: m.description || m.eventDescription || '',
          })),
        }
      }

      return {
        success: false,
        trackingNumber,
        status: 'error',
        statusDescription: (result as any)?.message || 'Takip bilgisi alınamadı',
        history: [],
      }
    } catch (e: any) {
      console.error('[mng] trackShipment error', e)
      return {
        success: false,
        trackingNumber,
        status: 'error',
        statusDescription: e.message || 'API bağlantı hatası',
        history: [],
      }
    }
  }

  async cancelShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const { ok, data: result } = await this.api(
        'POST',
        '/consumer-api/plus-command/v1/order/cancel',
        { trackingNo: trackingNumber }
      )
      return {
        success: ok,
        message: (result as any)?.message || (ok ? 'Kargo iptal edildi' : 'İptal başarısız'),
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'API bağlantı hatası' }
    }
  }

  async getBarcode(trackingNumber: string): Promise<{ success: boolean; barcodeBase64?: string; error?: string }> {
    try {
      const { ok, data: result } = await this.api(
        'GET',
        `/consumer-api/barcode-command/v1/barcode?trackingNo=${encodeURIComponent(trackingNumber)}`
      )
      if (ok && (result as any)?.barcode) {
        return { success: true, barcodeBase64: (result as any).barcode }
      }
      return { success: false, error: (result as any)?.message || 'Barkod alınamadı' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
}

export const mngKargo = new MngKargoClient()
