// E-Arşiv fatura sağlayıcı soyutlaması.
// Gerçek entegrasyon (BirFatura, Paraşüt, Logo İşbaşı, GİB Portal vs.)
// bu interface'i implemente eden yeni bir dosya ile eklenir;
// uygulama kodu sağlayıcıdan bağımsız kalır.

export type EArsivInvoicePayload = {
  invoiceNumber: string
  issueDate: string // ISO tarih
  // Satıcı (faturanın alıcısı — platform komisyon faturası satıcıya kesilir)
  buyer: {
    name: string // şirket ünvanı veya ad soyad
    taxNumber: string | null // VKN/TCKN
    taxOffice: string | null
    address?: string | null
    email?: string | null
  }
  lines: Array<{
    description: string
    quantity: number
    unitPrice: number // KDV hariç
    kdvRate: number // %
  }>
  totals: {
    base: number // KDV hariç toplam
    kdv: number
    grandTotal: number
  }
  // Serbest metin not (dönem bilgisi vs.)
  note?: string
}

export type EArsivSendResult =
  | { ok: true; providerUuid: string; sentAt: string }
  | { ok: false; error: string }

export interface EArsivProvider {
  /** Sağlayıcı kimliği — commission_invoices.earsiv_provider alanına yazılır */
  readonly name: string
  /** Faturayı sağlayıcıya gönderir (GİB e-Arşiv). */
  sendInvoice(payload: EArsivInvoicePayload): Promise<EArsivSendResult>
  /** Gönderilmiş faturayı iptal eder. */
  cancelInvoice(providerUuid: string, reason: string): Promise<EArsivSendResult>
}
