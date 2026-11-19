import { COMPANY_INFO } from '@/lib/company-info'
import { CHECKOUT_VERSION, SALE_TERMS, PRE_INFORMATION } from '@/lib/agreements/checkout-terms'
export function SaleDocumentPage({ type }: { type: 'mesafeli_satis' | 'on_bilgilendirme' }) {
  const title = type === 'mesafeli_satis' ? 'Mesafeli Satış Sözleşmesi' : 'Ön Bilgilendirme Formu'
  const terms = type === 'mesafeli_satis' ? SALE_TERMS : PRE_INFORMATION
  return <div className="container max-w-4xl py-12 space-y-6"><h1 className="text-3xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">Sürüm {CHECKOUT_VERSION}. Siparişinize özel belge ödeme öncesinde hazırlanır.</p><section className="rounded-lg border p-5 space-y-2"><h2 className="text-xl font-semibold">Platform bilgileri</h2><p>{COMPANY_INFO.legalName}</p><p>{COMPANY_INFO.address}</p><p>Vergi dairesi: {COMPANY_INFO.taxOffice} · VKN: {COMPANY_INFO.taxNumber} · Ticaret sicili: {COMPANY_INFO.tradeRegistryNumber}</p><p>novagross.com · <a href={`mailto:${COMPANY_INFO.email}`} className="underline">{COMPANY_INFO.email}</a></p></section>{terms.map((section, index) => <section key={section.title} className="space-y-2"><h2 className="text-xl font-semibold">{index + 1}. {section.title}</h2><p className="text-muted-foreground leading-relaxed">{section.text}</p></section>)}</div>
}
