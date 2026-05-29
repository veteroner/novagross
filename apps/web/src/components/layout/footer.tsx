import Link from 'next/link'
import Image from 'next/image'
import { JsonLd } from '@/components/seo/json-ld'
import { generateLocalBusinessSchema } from '@/lib/structured-data'

export function Footer() {
  return (
    <footer className="border-t bg-muted/50" role="contentinfo" aria-label="Site bilgileri ve navigasyon">
      {/* LocalBusiness Schema for SEO */}
      <JsonLd data={generateLocalBusinessSchema()} />
      
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <Image
              src="/logo.png"
              alt="Novagross"
              width={200}
              height={56}
              className="h-12 w-auto mb-4"
            />
            <p className="text-sm text-muted-foreground">
              En kaliteli ürünler, en uygun fiyatlarla. Güvenli alışveriş, hızlı teslimat.
            </p>
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
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Novagross. Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi tarafından işletilmektedir.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-sm text-muted-foreground" aria-label="Güvenli ödeme seçenekleri">Güvenli Ödeme:</span>
            <div className="flex gap-3 items-center" role="list" aria-label="Kabul edilen ödeme yöntemleri">
              <Image 
                src="/images/payment/visa.png" 
                alt="Visa kartı kabul edilir" 
                width={40} 
                height={25} 
                className="h-6 w-auto object-contain"
                role="listitem"
              />
              <Image 
                src="/images/payment/mastercard.png" 
                alt="MasterCard kabul edilir" 
                width={40} 
                height={25} 
                className="h-6 w-auto object-contain"
                role="listitem"
              />
              <div
                className="h-6 px-2 rounded border flex items-center text-[10px] font-semibold text-muted-foreground"
                role="listitem"
                aria-label="Troy kartı kabul edilir"
              >
                TROY
              </div>
              <Image 
                src="/images/payment/iyzico-footer.png" 
                alt="iyzico ile güvenli ödeme" 
                width={120} 
                height={30} 
                className="h-7 w-auto object-contain"
                role="listitem"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
