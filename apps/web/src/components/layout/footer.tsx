import Link from 'next/link'
import Image from 'next/image'
import { JsonLd } from '@/components/seo/json-ld'
import { generateLocalBusinessSchema } from '@/lib/structured-data'
import { COMPANY_INFO } from '@/lib/company-info'
import { EtbisBadge } from '@/components/layout/etbis-badge'

export function Footer() {
  return (
    <footer className="border-t bg-muted/50" role="contentinfo" aria-label="Site bilgileri ve navigasyon">
      {/* LocalBusiness Schema for SEO */}
      <JsonLd data={generateLocalBusinessSchema()} />
      
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold mb-4">Novagross</h3>
            <p className="text-sm text-muted-foreground">
              En kaliteli ürünler, en uygun fiyatlarla. Güvenli alışveriş, hızlı teslimat.
            </p>
            <address className="mt-4 not-italic text-xs leading-relaxed text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">{COMPANY_INFO.legalName}</p>
              <p>{COMPANY_INFO.address}</p>
              <p>
                Vergi Dairesi: {COMPANY_INFO.taxOffice} · Vergi No: {COMPANY_INFO.taxNumber}
              </p>
              <p>Ticaret Sicil No: {COMPANY_INFO.tradeRegistryNumber}</p>
              {COMPANY_INFO.mersisNumber && <p>MERSİS No: {COMPANY_INFO.mersisNumber}</p>}
              <p>
                E-posta:{' '}
                <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-foreground underline-offset-2 hover:underline">
                  {COMPANY_INFO.email}
                </a>
              </p>
            </address>
            <div className="mt-4">
              <EtbisBadge />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-4">Hızlı Linkler</h3>
            <nav aria-label="Hızlı linkler">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/urunler" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Tüm Ürünler
                  </Link>
                </li>
                <li>
                  <Link href="/kampanyalar" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Kampanyalar
                  </Link>
                </li>
                <li>
                  <Link href="/yeni-gelenler" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Yeni Gelenler
                  </Link>
                </li>
                <li>
                  <Link href="/satici-ol" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Satıcı Ol
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-bold mb-4">Müşteri Hizmetleri</h3>
            <nav aria-label="Müşteri hizmetleri">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/iletisim" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    İletişim
                  </Link>
                </li>
                <li>
                  <Link href="/hakkimizda" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Hakkımızda
                  </Link>
                </li>
                <li>
                  <Link href="/sikca-sorulan-sorular" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    S.S.S
                  </Link>
                </li>
                <li>
                  <Link href="/kargo-takip" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Kargo Takip
                  </Link>
                </li>
                <li>
                  <Link href="/iade-degisim" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    İade & Değişim
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold mb-4">Yasal</h3>
            <nav aria-label="Yasal bilgiler">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/gizlilik-politikasi" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Gizlilik Politikası
                  </Link>
                </li>
                <li>
                  <Link href="/kullanim-kosullari" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Kullanım Koşulları
                  </Link>
                </li>
                <li>
                  <Link href="/kvkk" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    KVKK
                  </Link>
                </li>
                <li>
                  <Link href="/mesafeli-satis-sozlesmesi" className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm">
                    Mesafeli Satış Sözleşmesi
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t mt-8 pt-8 flex flex-col items-center gap-6 lg:flex-row lg:justify-between lg:gap-8">
          <p className="max-w-xl text-center text-sm leading-relaxed text-muted-foreground lg:text-left">
            © {new Date().getFullYear()} {COMPANY_INFO.brand}. {COMPANY_INFO.legalName} tarafından işletilmektedir.
          </p>
          <div className="flex w-full max-w-[429px] shrink-0 flex-col items-center gap-3 lg:items-end">
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Güvenli Ödeme</span>
            <Image
              src="/images/payment/iyzico-footer.png"
              alt="iyzico ile güvenli ödeme: Mastercard, Visa, American Express ve TROY"
              width={858}
              height={64}
              className="h-auto w-full"
              unoptimized
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
