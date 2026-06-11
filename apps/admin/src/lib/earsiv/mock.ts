import { randomUUID } from 'crypto'
import type { EArsivProvider, EArsivInvoicePayload, EArsivSendResult } from './types'

// Geliştirme/test sağlayıcısı: hiçbir dış servise gitmez,
// her gönderimi başarılı sayar ve sahte UUID üretir.
// Gerçek sağlayıcı bağlanana kadar earsiv_status='sent' akışını uçtan uca test etmeyi sağlar.
export class MockEArsivProvider implements EArsivProvider {
  readonly name = 'mock'

  async sendInvoice(payload: EArsivInvoicePayload): Promise<EArsivSendResult> {
    if (!payload.invoiceNumber) {
      return { ok: false, error: 'invoiceNumber zorunlu' }
    }
    return {
      ok: true,
      providerUuid: `mock-${randomUUID()}`,
      sentAt: new Date().toISOString(),
    }
  }

  async cancelInvoice(providerUuid: string): Promise<EArsivSendResult> {
    if (!providerUuid.startsWith('mock-')) {
      return { ok: false, error: 'Bilinmeyen mock UUID' }
    }
    return {
      ok: true,
      providerUuid,
      sentAt: new Date().toISOString(),
    }
  }
}
