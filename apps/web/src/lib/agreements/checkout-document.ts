import { CHECKOUT_VERSION, SALE_TERMS, PRE_INFORMATION } from './checkout-terms'
import { COMPANY_INFO } from '@/lib/company-info'
export type CheckoutDocument = {
  version: string
  platform: typeof COMPANY_INFO
  buyer: { name: string; email: string; phone: string; address: string; billingAddress: string }
  sellers: { id: string; name: string; address: string; email: string; phone: string; taxNumber: string; taxOffice: string }[]
  items: { productId: string; name: string; quantity: number; price: number; sellerId: string | null }[]
  subtotal: number; shipping: number; discount: number; total: number; shippingMethod: string
  saleTerms: { title: string; text: string }[]
  preInformation: { title: string; text: string }[]
}
export function buildCheckoutDocument(data: Omit<CheckoutDocument, 'version' | 'platform' | 'saleTerms' | 'preInformation'>): CheckoutDocument {
  return { version: CHECKOUT_VERSION, platform: COMPANY_INFO, ...data, saleTerms: [...SALE_TERMS], preInformation: [...PRE_INFORMATION] }
}
export function checkoutDocumentText(doc: CheckoutDocument) {
  const money = (value: number) => `${Number(value).toFixed(2)} TL`
  return [
    `NOVAGROSS — SİPARİŞE ÖZEL ÖN BİLGİLENDİRME VE MESAFELİ SATIŞ SÖZLEŞMESİ\nSürüm: ${doc.version}`,
    `PLATFORM: ${doc.platform.legalName}\n${doc.platform.address}\n${doc.platform.email}\nVKN: ${doc.platform.taxNumber}`,
    `ALICI: ${doc.buyer.name}\n${doc.buyer.email} · ${doc.buyer.phone}\nTeslimat: ${doc.buyer.address}\nFatura: ${doc.buyer.billingAddress}`,
    ...doc.sellers.map(s => `SATICI: ${s.name}\n${s.address}\n${s.email} · ${s.phone}\nVergi dairesi: ${s.taxOffice} · VKN: ${s.taxNumber}`),
    ...doc.items.map(i => `${i.name} · ${i.quantity} adet × ${money(i.price)} = ${money(i.price * i.quantity)} · Satıcı: ${doc.sellers.find(s => s.id === i.sellerId)?.name || 'Belirtilmemiş'}`),
    `Ara toplam: ${money(doc.subtotal)}\nİndirim: ${money(doc.discount)}\nKargo: ${money(doc.shipping)}\nÖDENECEK TOPLAM (vergiler dahil): ${money(doc.total)}\nTeslimat seçimi: ${doc.shippingMethod === 'express' ? 'Ekspres' : 'Standart'}`,
    'ÖN BİLGİLENDİRME FORMU', ...doc.preInformation.map((s, i) => `${i + 1}. ${s.title}\n${s.text}`),
    'MESAFELİ SATIŞ SÖZLEŞMESİ', ...doc.saleTerms.map((s, i) => `${i + 1}. ${s.title}\n${s.text}`),
  ].join('\n\n')
}
