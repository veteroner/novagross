/**
 * Novagross'u işleten şirketin yasal bilgileri.
 * Footer, Hakkımızda ve sözleşme sayfaları bu tek kaynaktan beslenmelidir.
 */
export const COMPANY_INFO = {
  legalName: 'Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi',
  brand: 'Novagross',
  address: 'Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sincan/Ankara',
  email: 'bilgi@teknovagroup.com',
  taxOffice: 'Sincan',
  taxNumber: '8961000730',
  tradeRegistryNumber: '527879',
  /** MERSİS numarası biliniyorsa doldurun; boşsa gösterilmez. */
  mersisNumber: '',
} as const

/**
 * ETBİS (Elektronik Ticaret Bilgi Sistemi) kaydı.
 * verifyUrl: ETBİS panelinde verilen site doğrulama linki.
 * qrImage: ETBİS panelinden indirilen resmi karekod görselinin /public altındaki yolu.
 * İkisi de doluysa footer ve Hakkımızda sayfasında ETBİS rozeti gösterilir.
 */
export const ETBIS = {
  verifyUrl: 'https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=a3d9e8cf-a447-4491-82a0-98194b56d152',
  qrImage: '/images/etbis-karekod.png',
} as const

export const hasEtbis = Boolean(ETBIS.verifyUrl && ETBIS.qrImage)
