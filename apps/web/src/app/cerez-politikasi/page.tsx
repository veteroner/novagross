import { Metadata } from 'next'
import Link from 'next/link'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'

export const metadata: Metadata = genMetadata({
  title: 'Çerez Politikası',
  description: 'Novagross web sitesinde kullanılan çerezler (cookies) hakkında detaylı bilgi. Zorunlu çerezler, analitik çerezler ve pazarlama çerezleri kullanımı.',
  keywords: ['çerez politikası', 'cookies', 'gizlilik', 'web sitesi kullanımı'],
  url: '/cerez-politikasi',
})

export const revalidate = 60 * 60 * 24

export default function CerezPolitikasiPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <JsonLd
        data={generateWebPageSchema({
          name: 'Çerez Politikası',
          description: 'Novagross web sitesinde kullanılan çerezler (cookies) hakkında detaylı bilgi. Zorunlu çerezler, analitik çerezler ve pazarlama çerezleri kullanımı.',
          url: '/cerez-politikasi',
          dateModified: '2026-01-27',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Çerez Politikası', url: '/cerez-politikasi' },
        ])}
      />

      <div className="container max-w-4xl py-12">
        <h1 className="text-4xl font-bold mb-8">Çerez Politikası</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Çerez Nedir?</h2>
          <p className="text-muted-foreground">
            Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcılar aracılığıyla cihazınıza 
            veya ağ sunucusuna depolanan küçük metin dosyalarıdır. İnternet sitesine ilk ziyaretinizde 
            cihazınıza çerez yerleştirilir ve böylece siteyi her ziyaret ettiğinizde tarayıcınız bu çerezi 
            siteye geri gönderir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Çerezleri Nasıl Kullanıyoruz?</h2>
          <p className="text-muted-foreground mb-4">
            Novagross olarak, web sitemizde aşağıdaki amaçlarla çerezler kullanıyoruz:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Web sitesinin düzgün çalışmasını sağlamak</li>
            <li>Kullanıcı deneyimini iyileştirmek</li>
            <li>Güvenlik önlemleri almak</li>
            <li>Site performansını analiz etmek</li>
            <li>Kişiselleştirilmiş içerik sunmak</li>
            <li>Pazarlama faaliyetlerini optimize etmek</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Kullandığımız Çerez Türleri</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">3.1. Zorunlu Çerezler</h3>
              <p className="text-sm text-muted-foreground">
                Web sitesinin temel işlevlerini yerine getirmesi için gerekli olan çerezlerdir. 
                Bu çerezler olmadan site düzgün çalışamaz. Örnek: Oturum çerezleri, güvenlik çerezleri, 
                sepet bilgileri.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Saklama Süresi:</strong> Oturum sonuna kadar veya 1 yıl
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">3.2. Performans ve Analitik Çerezleri</h3>
              <p className="text-sm text-muted-foreground">
                Ziyaretçilerin web sitesini nasıl kullandığını anlamamıza yardımcı olan çerezlerdir. 
                Bu bilgiler anonim olarak toplanır ve site performansını iyileştirmek için kullanılır.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Kullanılan Servisler:</strong> Google Analytics, Microsoft Clarity
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Saklama Süresi:</strong> 2 yıl
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">3.3. İşlevsellik Çerezleri</h3>
              <p className="text-sm text-muted-foreground">
                Tercihlerinizi hatırlayan ve kişiselleştirilmiş bir deneyim sunan çerezlerdir. 
                Örnek: Dil tercihi, bölge ayarları, kullanıcı arayüzü tercihleri.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Saklama Süresi:</strong> 1 yıl
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">3.4. Pazarlama ve Hedefleme Çerezleri</h3>
              <p className="text-sm text-muted-foreground">
                İlgi alanlarınıza uygun reklamlar göstermek için kullanılan çerezlerdir. 
                Aynı reklamın tekrar gösterilmesini engeller ve reklam kampanyalarının etkinliğini ölçer.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Kullanılan Servisler:</strong> Google Ads, Facebook Pixel
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Saklama Süresi:</strong> 13 ay
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Çerez Ayarlarınızı Yönetme</h2>
          <p className="text-muted-foreground mb-4">
            Çerez tercihlerinizi istediğiniz zaman değiştirebilirsiniz:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Sayfanın alt kısmındaki çerez ayarları butonuna tıklayarak</li>
            <li>Tarayıcınızın ayarlarından çerezleri yönetebilir veya silebilirsiniz</li>
            <li>Zorunlu çerezler dışındaki tüm çerezleri reddetme hakkına sahipsiniz</li>
          </ul>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Not:</strong> Çerezleri devre dışı bırakmanız durumunda, web sitesinin bazı 
              özellikleri düzgün çalışmayabilir.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Üçüncü Taraf Çerezleri</h2>
          <p className="text-muted-foreground mb-4">
            Web sitemizde aşağıdaki üçüncü taraf servislerin çerezleri kullanılabilir:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong>Google Analytics:</strong> Site trafiğini ve kullanıcı davranışlarını analiz etmek için</li>
            <li><strong>Facebook Pixel:</strong> Reklam kampanyalarını optimize etmek için</li>
            <li><strong>Microsoft Clarity:</strong> Kullanıcı deneyimini iyileştirmek için</li>
            <li><strong>iyzico:</strong> Güvenli ödeme işlemleri için</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Tarayıcı Ayarları</h2>
          <p className="text-muted-foreground mb-4">
            Popüler tarayıcılarda çerez ayarlarını yönetmek için:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler</li>
            <li><strong>Firefox:</strong> Seçenekler → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
            <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezler</li>
            <li><strong>Edge:</strong> Ayarlar → Gizlilik, arama ve hizmetler → Çerezler</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. KVKK ve Kişisel Veriler</h2>
          <p className="text-muted-foreground">
            Çerezler aracılığıyla toplanan veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu 
            (KVKK) kapsamında işlenmektedir. Detaylı bilgi için{' '}
            <Link href="/kvkk" className="text-primary hover:underline">KVKK Aydınlatma Metni</Link>
            {' '}ve{' '}
            <Link href="/gizlilik-politikasi" className="text-primary hover:underline">Gizlilik Politikası</Link>
            {' '}sayfalarımızı inceleyebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. İletişim</h2>
          <p className="text-muted-foreground">
            Çerez politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm"><strong>E-posta:</strong> bilgi@teknovagroup.com</p>
            <p className="text-sm"><strong>Telefon:</strong> 0850 850 20 20</p>
            <p className="text-sm">
              <strong>Adres:</strong> Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sıncan/Ankara
            </p>
          </div>
        </section>

        <section className="pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Son Güncelleme:</strong> 27 Ocak 2026
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Bu çerez politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda 
            sizi bilgilendireceğiz.
          </p>
        </section>
      </div>
      </div>
    </>
  )
}
