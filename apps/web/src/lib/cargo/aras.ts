/**
 * Aras Kargo API Client
 * Documentation: https://developer.araskargo.com.tr/
 */

export interface ArasShipmentRequest {
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
  receiverIdNumber?: string // TC Kimlik No
  
  weight: number // kg
  pieceCount: number // Koli sayısı
  paymentType: 'SENDER' | 'RECEIVER'
  deliveryType: 'NORMAL' | 'EXPRESS'
  
  // Opsiyonel
  description?: string
  invoiceNumber?: string
  invoiceValue?: number
}

export interface ArasShipmentResponse {
  success: boolean
  trackingNumber?: string
  barcodeNumber?: string
  labelUrl?: string
  error?: string
  errorCode?: string
}

export interface ArasTrackingResponse {
  success: boolean
  trackingNumber: string
  status: string
  statusDescription: string
  currentLocation?: string
  history: Array<{
    date: string
    time: string
    location: string
    status: string
    description: string
  }>
  estimatedDelivery?: string
}

export class ArasKargoClient {
  private username: string
  private password: string
  private customerId: string
  private baseUrl: string
  
  constructor() {
    this.username = process.env.ARAS_API_USERNAME!
    this.password = process.env.ARAS_API_PASSWORD!
    this.customerId = process.env.ARAS_CUSTOMER_ID!
    this.baseUrl = process.env.ARAS_BASE_URL || 'https://eservice.araskargo.com.tr/api'
    
    if (!this.username || !this.password || !this.customerId) {
      console.warn('⚠️ Aras Kargo API credentials eksik')
    }
  }
  
  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
        }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.token) {
        return result.token
      }
      
      console.error('Aras Kargo auth failed:', result)
      return null
    } catch (error) {
      console.error('Aras Kargo auth error:', error)
      return null
    }
  }
  
  /**
   * Create a new shipment
   */
  async createShipment(data: ArasShipmentRequest): Promise<ArasShipmentResponse> {
    try {
      const token = await this.getAuthToken()
      
      if (!token) {
        return {
          success: false,
          error: 'Kimlik doğrulama başarısız',
          errorCode: 'AUTH_FAILED',
        }
      }
      
      const payload = {
        customerId: this.customerId,
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
          email: data.receiverEmail,
          idNumber: data.receiverIdNumber,
        },
        shipment: {
          weight: data.weight,
          pieceCount: data.pieceCount,
          paymentType: data.paymentType,
          deliveryType: data.deliveryType,
          description: data.description,
          invoiceNumber: data.invoiceNumber,
          invoiceValue: data.invoiceValue,
        },
      }
      
      const response = await fetch(`${this.baseUrl}/shipment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      
      const result = await response.json()
      
      if (response.ok && result.trackingNumber) {
        return {
          success: true,
          trackingNumber: result.trackingNumber,
          barcodeNumber: result.barcodeNumber,
          labelUrl: result.labelUrl,
        }
      }
      
      return {
        success: false,
        error: result.message || 'Kargo oluşturulamadı',
        errorCode: result.errorCode,
      }
    } catch (error: any) {
      console.error('Aras Kargo API Error:', error)
      return {
        success: false,
        error: error.message || 'API bağlantı hatası',
      }
    }
  }
  
  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string): Promise<ArasTrackingResponse> {
    try {
      const token = await this.getAuthToken()
      
      if (!token) {
        return {
          success: false,
          trackingNumber,
          status: 'error',
          statusDescription: 'Kimlik doğrulama başarısız',
          history: [],
        }
      }
      
      const response = await fetch(
        `${this.baseUrl}/shipment/track/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      
      const result = await response.json()
      
      if (response.ok && result.trackingInfo) {
        return {
          success: true,
          trackingNumber: result.trackingInfo.trackingNumber,
          status: result.trackingInfo.status,
          statusDescription: result.trackingInfo.statusDescription,
          currentLocation: result.trackingInfo.currentLocation,
          history: result.trackingInfo.movements || [],
          estimatedDelivery: result.trackingInfo.estimatedDelivery,
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
      console.error('Aras Tracking Error:', error)
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
      const token = await this.getAuthToken()
      
      if (!token) {
        return {
          success: false,
          message: 'Kimlik doğrulama başarısız',
        }
      }
      
      const response = await fetch(`${this.baseUrl}/shipment/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
    pieceCount: number
    deliveryType: 'NORMAL' | 'EXPRESS'
  }): Promise<{ success: boolean; cost?: number; currency?: string; error?: string }> {
    try {
      const token = await this.getAuthToken()
      
      if (!token) {
        return {
          success: false,
          error: 'Kimlik doğrulama başarısız',
        }
      }
      
      const response = await fetch(`${this.baseUrl}/shipment/calculate-cost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: this.customerId,
          senderCity: data.senderCity,
          receiverCity: data.receiverCity,
          weight: data.weight,
          pieceCount: data.pieceCount,
          deliveryType: data.deliveryType,
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
export const arasKargo = new ArasKargoClient()
