/**
 * Unified Cargo Service
 * Tüm kargo firmalarını tek bir interface'den yönetir
 */

import { yurticiKargo, type YurticiShipmentRequest, type YurticiShipmentResponse } from './yurtici'
import { arasKargo, type ArasShipmentRequest, type ArasShipmentResponse } from './aras'

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
        case 'ptt':
        case 'surat':
          // TODO: Implement when APIs are available
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
        
        case 'mng':
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
    trackingNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (provider) {
        case 'yurtici':
          return await yurticiKargo.cancelShipment(trackingNumber)
        
        case 'aras':
          return await arasKargo.cancelShipment(trackingNumber)
        
        case 'mng':
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
          return {
            success: false,
            error: `${provider.toUpperCase()} fiyat hesaplama entegrasyonu henüz aktif değil`,
          }
        
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

// Export types
export type {
  YurticiShipmentRequest,
  YurticiShipmentResponse,
  ArasShipmentRequest,
  ArasShipmentResponse,
}
