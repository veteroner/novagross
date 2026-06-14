/**
 * Yurtiçi Kargo API Client
 * Documentation: https://developer.yurticikargo.com/
 */

export interface YurticiShipmentRequest {
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
  
  weight: number // kg
  desi: number // (length * width * height) / 3000
  paymentType: 'SENDER' | 'RECEIVER' // Ödemeyi kim yapacak
  serviceType: 'STANDART' | 'EXPRESS' // Teslimat hızı
  
  // Opsiyonel
  cargoCount?: number // Koli sayısı
  description?: string
  invoiceNumber?: string
  invoiceValue?: number
}

export interface YurticiShipmentResponse {
  success: boolean
  trackingNumber?: string
  labelUrl?: string
  error?: string
  errorCode?: string
}

export interface YurticiTrackingResponse {
  success: boolean
  trackingNumber: string
  status: string
  statusDescription: string
  history: Array<{
    date: string
    location: string
    status: string
    description: string
  }>
  estimatedDelivery?: string
}

export class YurticiKargoClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string
  private customerId: string
  
  constructor() {
    this.apiKey = process.env.YURTICI_API_KEY!
    this.apiSecret = process.env.YURTICI_API_SECRET!
    this.customerId = process.env.YURTICI_CUSTOMER_ID!
    this.baseUrl = process.env.YURTICI_BASE_URL || 'https://entegrasyon.yurticikargo.com/api'
    
    if (!this.apiKey || !this.apiSecret || !this.customerId) {
      console.warn('⚠️ Yurtiçi Kargo API credentials eksik')
    }
  }
  
  /**
   * Create a new shipment
   */
  async createShipment(data: YurticiShipmentRequest): Promise<YurticiShipmentResponse> {
    try {
      const payload = {
        customerId: this.customerId,
        sender: {
          name: data.senderName,
          address: data.senderAddress,
          cityName: data.senderCity,
          districtName: data.senderDistrict,
          phoneNumber: data.senderPhone,
        },
        receiver: {
          name: data.receiverName,
          address: data.receiverAddress,
          cityName: data.receiverCity,
          districtName: data.receiverDistrict,
          phoneNumber: data.receiverPhone,
          email: data.receiverEmail,
        },
        shipmentDetails: {
          weight: data.weight,
          desi: data.desi,
          cargoCount: data.cargoCount || 1,
          paymentType: data.paymentType,
          serviceType: data.serviceType,
          description: data.description,
          invoiceNumber: data.invoiceNumber,
          invoiceValue: data.invoiceValue,
        },
      }
      
      const response = await fetch(`${this.baseUrl}/shipment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
          'X-API-SECRET': this.apiSecret,
        },
        body: JSON.stringify(payload),
      })
      
      const result = await response.json()
      
      if (response.ok && result.trackingNumber) {
        return {
          success: true,
          trackingNumber: result.trackingNumber,
          labelUrl: result.labelUrl,
        }
      }
      
      return {
        success: false,
        error: result.message || 'Kargo oluşturulamadı',
        errorCode: result.errorCode,
      }
    } catch (error: any) {
      console.error('Yurtiçi Kargo API Error:', error)
      return {
        success: false,
        error: error.message || 'API bağlantı hatası',
      }
    }
  }
  
  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string): Promise<YurticiTrackingResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/shipment/track?trackingNumber=${trackingNumber}`,
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'X-API-SECRET': this.apiSecret,
          },
        }
      )
      
      const result = await response.json()
      
      if (response.ok) {
        return {
          success: true,
          trackingNumber: result.trackingNumber,
          status: result.status,
          statusDescription: result.statusDescription,
          history: result.history || [],
          estimatedDelivery: result.estimatedDelivery,
        }
      }
      
      return {
        success: false,
        trackingNumber,
        status: 'error',
        statusDescription: result.message || 'Takip bilgisi alınamadı',
        history: [],
      }
    } catch (error: any) {
      console.error('Yurtiçi Tracking Error:', error)
      return {
        success: false,
        trackingNumber,
        status: 'error',
        statusDescription: error.message || 'API bağlantı hatası',
        history: [],
      }
    }
  }
  
  /**
   * Cancel a shipment
   */
  async cancelShipment(trackingNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/shipment/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
          'X-API-SECRET': this.apiSecret,
        },
        body: JSON.stringify({ trackingNumber }),
      })
      
      const result = await response.json()
      
      return {
        success: response.ok,
        message: result.message || (response.ok ? 'Kargo iptal edildi' : 'İptal başarısız'),
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'API bağlantı hatası',
      }
    }
  }
  
  /**
   * Get shipping cost estimate
   */
  async getShippingCost(data: {
    senderCity: string
    receiverCity: string
    weight: number
    desi: number
    serviceType: 'STANDART' | 'EXPRESS'
  }): Promise<{ success: boolean; cost?: number; currency?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/shipment/cost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
          'X-API-SECRET': this.apiSecret,
        },
        body: JSON.stringify({
          customerId: this.customerId,
          senderCity: data.senderCity,
          receiverCity: data.receiverCity,
          weight: data.weight,
          desi: data.desi,
          serviceType: data.serviceType,
        }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.cost) {
        return {
          success: true,
          cost: result.cost,
          currency: result.currency || 'TRY',
        }
      }
      
      return {
        success: false,
        error: result.message || 'Fiyat hesaplanamadı',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'API bağlantı hatası',
      }
    }
  }
}

// Export singleton instance
export const yurticiKargo = new YurticiKargoClient()
