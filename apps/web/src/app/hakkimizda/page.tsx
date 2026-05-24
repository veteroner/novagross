import { Card } from '@novagross/ui'
import type { Metadata } from 'next'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'
import { ShippingFeatureText } from '@/components/shipping-threshold-text'

export const metadata: Metadata = genMetadata({
  title: 'Hakkımızda',
  description: 'Novagross olarak, müşterilerimize en kaliteli ürünleri en uygun fiyatlarla sunmayı amaçlıyoruz. Güvenilir alışveriş deneyimi için buradayız.',
  keywords: ['hakkımızda', 'novagross hakkında', 'e-ticaret', 'online alışveriş', 'kurumsal'],
  url: '/hakkimizda',
})

export const revalidate = 60 * 60 * 24

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          name: 'Hakkımızda',
          description: 'Novagross olarak, müşterilerimize en kaliteli ürünleri en uygun fiyatlarla sunmayı amaçlıyoruz.',
          url: '/hakkimizda',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Hakkımızda', url: '/hakkimizda' },
        ])}
      />

      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Hakkımızda</h1>

        <div className="space-y-6">
          {/* Hikayemiz */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Hikayemiz</h2>
            <div className="prose max-w-none space-y-4">
              <p className="text-foreground leading-relaxed">
                Novagross, modern e-ticaret deneyimini Türkiye'ye getirmek amacıyla kurulmuştur.
                Müşterilerimize en kaliteli ürünleri, en uygun fiyatlarla sunmak ve mükemmel 
                bir alışveriş deneyimi yaşatmak bizim önceliğimizdir.
              </p>
              <p className="text-foreground leading-relaxed">
                Novagross markası, Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi 
                tarafından işletilmektedir. Ankara merkezli firmamız, e-ticaret sektöründe 
                güvenilir ve kaliteli hizmet anlayışıyla müşterilerimize hizmet vermektedir.
              </p>
              <p className="text-foreground leading-relaxed">
                Geniş ürün yelpazemiz ve güvenilir hizmet anlayışımızla, online alışverişin 
                en güvenilir adresi olmayı hedefliyoruz. Her geçen gün büyüyen ailemize 
                siz de katılın!
              </p>
            </div>
          </Card>

          {/* Misyon & Vizyon */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Misyonumuz</h2>
              <p className="text-foreground leading-relaxed">
                Müşterilerimize kaliteli ürünleri en hızlı ve güvenilir şekilde ulaştırmak, 
                alışveriş deneyimini kolaylaştırmak ve her zaman yanlarında olmak.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Vizyonumuz</h2>
              <p className="text-foreground leading-relaxed">
                Türkiye'nin en çok tercih edilen online alışveriş platformu olmak ve 
                müşteri memnuniyetinde sektörün standardını belirlemek.
              </p>
            </Card>
          </div>

          {/* Neden Novagross */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Neden Novagross?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚚</div>
                <div>
                  <h3 className="font-semibold mb-1">Hızlı Teslimat</h3>
                  <ShippingFeatureText />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">💳</div>
                <div>
                  <h3 className="font-semibold mb-1">Güvenli Ödeme</h3>
                  <p className="text-sm text-foreground">
                    SSL sertifikalı güvenli ödeme altyapısı ile huzurlu alışveriş
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">↩️</div>
                <div>
                  <h3 className="font-semibold mb-1">Kolay İade</h3>
                  <p className="text-sm text-foreground">
                    14 gün içinde koşulsuz iade ve değişim hakkı
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="font-semibold mb-1">Kaliteli Ürünler</h3>
                  <p className="text-sm text-foreground">
                    Orijinal ve garantili ürünler, güvenilir tedarikçiler
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">📞</div>
                <div>
                  <h3 className="font-semibold mb-1">7/24 Destek</h3>
                  <p className="text-sm text-foreground">
                    Müşteri hizmetlerimiz her zaman yanınızda
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">🎁</div>
                <div>
                  <h3 className="font-semibold mb-1">Özel Kampanyalar</h3>
                  <p className="text-sm text-foreground">
                    Düzenli indirim ve kampanyalardan faydalanın
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* İletişim Bilgileri */}
          <Card className="p-6 bg-muted">
            <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
            <div className="space-y-2">
              <p className="text-foreground">
                <strong>E-posta:</strong> bilgi@teknovagroup.com
              </p>
              <p className="text-foreground">
                <strong>Web:</strong> www.teknovagroup.com
              </p>
              <p className="text-foreground">
                <strong>Adres:</strong> Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sıncan/Ankara
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-foreground">
                Daha fazla bilgi için{' '}
                <a href="/iletisim" className="text-primary hover:underline font-semibold">
                  iletişim sayfamızı
                </a>{' '}
                ziyaret edebilirsiniz.
              </p>
            </div>
          </Card>

          {/* Şirket Bilgileri */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Şirket Bilgileri</h2>
            <div className="space-y-3 text-foreground">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Ticari Ünvan:</span>
                <span className="text-muted-foreground">Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Marka:</span>
                <span className="text-muted-foreground">Novagross</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Adres:</span>
                <span className="text-muted-foreground">Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sıncan/Ankara</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Vergi Dairesi:</span>
                <span className="text-muted-foreground">Sıncan</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Vergi No:</span>
                <span className="text-muted-foreground">8961000730</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="font-semibold min-w-[180px]">Ticaret Sicil No:</span>
                <span className="text-muted-foreground">527879</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </>
  )
}
