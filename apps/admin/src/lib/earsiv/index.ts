import type { EArsivProvider } from './types'
import { MockEArsivProvider } from './mock'

export type { EArsivProvider, EArsivInvoicePayload, EArsivSendResult } from './types'

// EARSIV_PROVIDER env'i ile sağlayıcı seçilir. Gerçek entegrasyon eklerken:
//  1. ./birfatura.ts gibi yeni bir provider yaz (EArsivProvider implement et)
//  2. Aşağıdaki switch'e ekle
//  3. Netlify env: EARSIV_PROVIDER=birfatura + sağlayıcı API anahtarları
export function getEArsivProvider(): EArsivProvider {
  const name = (process.env.EARSIV_PROVIDER || 'mock').toLowerCase()
  switch (name) {
    case 'mock':
      return new MockEArsivProvider()
    default:
      throw new Error(`Bilinmeyen e-arşiv sağlayıcısı: ${name}`)
  }
}
