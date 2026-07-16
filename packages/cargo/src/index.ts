/**
 * Unified Cargo Service
 * Tüm kargo firmalarını tek bir interface'den yönetir
 */

import { yurticiKargo, type YurticiShipmentRequest, type YurticiShipmentResponse } from './yurtici'
import { arasKargo, type ArasShipmentRequest, type ArasShipmentResponse } from './aras'
import { mngKargo, type MngShipmentRequest, type MngShipmentResponse } from './mng'

export type CargoProvider = 'yurtici' | 'aras' | 'mng' | 'ptt' | 'surat'

export interface UnifiedShipmentRequest {
  // Sender
  senderName: string
  senderAddress: string
  senderCity: string
  senderDistrict: string
  senderPhone: string
  
  // Receiver
  receiverName: string
  receiverAddress: string
  receiverCity: string
  receiverDistrict: string
  receiverPhone: string
  receiverEmail?: string
  receiverIdNumber?: string
  
  // Package
  weight: number
  pieceCount?: number
  desi?: number
  
  // Service
  paymentType: 'SENDER' | 'RECEIVER'
  serviceType: 'STANDARD' | 'EXPRESS'
  
  // Optional
  description?: string
  invoiceNumber?: string
  invoiceValue?: number
}

export interface UnifiedShipmentResponse {
  success: boolean
  provider: CargoProvider
  trackingNumber?: string
  labelUrl?: string
  error?: string
  errorCode?: string
}

export interface UnifiedTrackingResponse {
  success: boolean
  provider: CargoProvider
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

export class CargoService {
  /**
   * Create shipment with specified provider
   */
  async createShipment(
    provider: CargoProvider,
    data: UnifiedShipmentRequest
  ): Promise<UnifiedShipmentResponse> {
    try {
      switch (provider) {
        case 'yurtici':
          return await this.createYurticiShipment(data)
        
        case 'aras':
          return await this.createArasShipment(data)
        
        case 'mng':
          return await this.createMngShipment(data)

        case 'ptt':
        case 'surat':
          return {
            success: false,
            provider,
            error: `${provider.toUpperCase()} entegrasyonu henüz aktif değil`,
            errorCode: 'NOT_IMPLEMENTED',
          }
        
        default:
          return {
            success: false,
            provider,
            error: 'Geçersiz kargo firması',
            errorCode: 'INVALID_PROVIDER',
          }
      }
    } catch (error: any) {
      console.error(`Cargo service error (${provider}):`, error)
      return {
        success: false,
        provider,
        error: error.message || 'Beklenmeyen hata',
        errorCode: 'UNKNOWN_ERROR',
      }
    }
  }
  
  /**
   * Get printable barcode/label for a shipment.
   * MNG: zpl = resmi etiket (Zebra formatı), officialBarcode = okuyucuların
   * beklediği gerçek barkod değeri (takip numarasından FARKLI).
   * Yalnızca destekleyen sağlayıcılar (MNG) için döner.
   */
  async getBarcode(
    provider: CargoProvider,
    trackingNumber: string
  ): Promise<{ success: boolean; barcodeBase64?: string; zpl?: string; officialBarcode?: string; error?: string }> {
    try {
      switch (provider) {
        case 'mng':
          return await mngKargo.getBarcode(trackingNumber)
        default:
          return { success: false, error: `${provider.toUpperCase()} barkod entegrasyonu yok` }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Barkod alınamadı' }
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(
    provider: CargoProvider,
    trackingNumber: string
  ): Promise<UnifiedTrackingResponse> {
    try {
      switch (provider) {
        case 'yurtici': {
          const result = await yurticiKargo.trackShipment(trackingNumber)
          return {
            ...result,
            provider: 'yurtici',
          }
        }
        
        case 'aras': {
          const result = await arasKargo.trackShipment(trackingNumber)
          return {
            ...result,
            provider: 'aras',
          }
        }
        
        case 'mng': {
          const result = await mngKargo.trackShipment(trackingNumber)
          return { ...result, provider: 'mng' }
        }

        case 'ptt':
        case 'surat':
          return {
            success: false,
            provider,
            trackingNumber,
            status: 'error',
            statusDescription: `${provider.toUpperCase()} takip entegrasyonu henüz aktif değil`,
            history: [],
          }
        
        default:
          return {
            success: false,
            provider,
            trackingNumber,
            status: 'error',
            statusDescription: 'Geçersiz kargo firması',
            history: [],
          }
      }
    } catch (error: any) {
      console.error(`Cargo tracking error (${provider}):`, error)
      return {
        success: false,
        provider,
        trackingNumber,
        status: 'error',
        statusDescription: error.message || 'Beklenmeyen hata',
        history: [],
      }
    }
  }
  
  /**
   * Cancel shipment
   */
  async cancelShipment(
    provider: CargoProvider,
    trackingNumber: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (provider) {
        case 'yurtici':
          return await yurticiKargo.cancelShipment(trackingNumber)

        case 'aras':
          return await arasKargo.cancelShipment(trackingNumber)

        case 'mng':
          return await mngKargo.cancelShipment(trackingNumber, reason)

        case 'ptt':
        case 'surat':
          return {
            success: false,
            message: `${provider.toUpperCase()} iptal entegrasyonu henüz aktif değil`,
          }
        
        default:
          return {
            success: false,
            message: 'Geçersiz kargo firması',
          }
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Beklenmeyen hata',
      }
    }
  }
  
  /**
   * Get shipping cost
   */
  async getShippingCost(
    provider: CargoProvider,
    data: {
      senderCity: string
      receiverCity: string
      weight: number
      serviceType: 'STANDARD' | 'EXPRESS'
    }
  ): Promise<{ success: boolean; cost?: number; currency?: string; error?: string }> {
    try {
      // Calculate desi (rough estimate if not provided)
      const desi = data.weight * 3 // Approximation
      
      switch (provider) {
        case 'yurtici':
          return await yurticiKargo.getShippingCost({
            ...data,
            desi,
            serviceType: data.serviceType === 'EXPRESS' ? 'EXPRESS' : 'STANDART',
          })
        
        case 'aras':
          return await arasKargo.getShippingCost({
            ...data,
            pieceCount: 1,
            deliveryType: data.serviceType === 'EXPRESS' ? 'EXPRESS' : 'NORMAL',
          })
        
        case 'mng':
        case 'ptt':
        case 'surat':
          return { success: false, error: `${provider.toUpperCase()} fiyat hesaplama entegrasyonu henüz aktif değil` }
        
        default:
          return {
            success: false,
            error: 'Geçersiz kargo firması',
          }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Beklenmeyen hata',
      }
    }
  }
  
  // Private helper methods
  
  private async createYurticiShipment(
    data: UnifiedShipmentRequest
  ): Promise<UnifiedShipmentResponse> {
    const request: YurticiShipmentRequest = {
      ...data,
      desi: data.desi || data.weight * 3,
      cargoCount: data.pieceCount || 1,
      serviceType: data.serviceType === 'EXPRESS' ? 'EXPRESS' : 'STANDART',
    }
    
    const result = await yurticiKargo.createShipment(request)
    
    return {
      ...result,
      provider: 'yurtici',
    }
  }
  
  private async createMngShipment(data: UnifiedShipmentRequest): Promise<UnifiedShipmentResponse> {
    const request: MngShipmentRequest = {
      senderName: data.senderName,
      senderAddress: data.senderAddress,
      senderCity: data.senderCity,
      senderDistrict: data.senderDistrict,
      senderPhone: data.senderPhone,
      receiverName: data.receiverName,
      receiverAddress: data.receiverAddress,
      receiverCity: data.receiverCity,
      receiverDistrict: data.receiverDistrict,
      receiverPhone: data.receiverPhone,
      receiverEmail: data.receiverEmail,
      weight: data.weight,
      pieceCount: data.pieceCount || 1,
      paymentType: data.paymentType,
      serviceType: data.serviceType,
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      invoiceValue: data.invoiceValue,
    }
    const result = await mngKargo.createShipment(request)
    return { ...result, provider: 'mng' }
  }

  private async createArasShipment(
    data: UnifiedShipmentRequest
  ): Promise<UnifiedShipmentResponse> {
    const request: ArasShipmentRequest = {
      ...data,
      pieceCount: data.pieceCount || 1,
      deliveryType: data.serviceType === 'EXPRESS' ? 'EXPRESS' : 'NORMAL',
    }
    
    const result = await arasKargo.createShipment(request)
    
    return {
      ...result,
      provider: 'aras',
    }
  }
}

// Export singleton instance
export const cargoService = new CargoService()

// MNG istemcisini doğrudan dışa aç (Finance Query mutabakatı için)
export { mngKargo } from './mng'

// Export types
export type {
  YurticiShipmentRequest,
  YurticiShipmentResponse,
  ArasShipmentRequest,
  ArasShipmentResponse,
  MngShipmentRequest,
  MngShipmentResponse,
}
export type { MngBulkShipmentRow } from './mng'
