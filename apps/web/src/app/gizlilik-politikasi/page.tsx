import { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'Novagross gizlilik politikası ve kişisel verilerin korunması',
}

export const revalidate = 60 * 60 * 24

export default function GizlilikPolitikasiPage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          name: 'Gizlilik Politikası',
          description: 'Novagross gizlilik politikası ve kişisel verilerin korunması',
          url: '/gizlilik-politikasi',
          dateModified: '2026-01-27',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Gizlilik Politikası', url: '/gizlilik-politikasi' },
        ])}
      />

      <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Gizlilik Politikası</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Kişisel Verilerin Korunması</h2>
          <p className="text-muted-foreground">
            Novagross olarak, müşterilerimizin kişisel verilerinin gizliliğini korumayı taahhüt ediyoruz.
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında verileriniz güvenli bir şekilde işlenmektedir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Toplanan Veriler</h2>
          <p className="text-muted-foreground mb-2">Sitemizde toplanan kişisel veriler şunlardır:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Ad, soyad ve iletişim bilgileri</li>
            <li>E-posta adresi ve telefon numarası</li>
            <li>Teslimat ve fatura adresi bilgileri</li>
            <li>Ödeme bilgileri (şifreli olarak saklanır)</li>
            <li>Sipariş geçmişi ve alışveriş tercihleri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Verilerin Kullanım Amacı</h2>
          <p className="text-muted-foreground mb-2">Toplanan veriler aşağıdaki amaçlarla kullanılmaktadır:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Sipariş işlemlerinin gerçekleştirilmesi</li>
            <li>Müşteri hizmetlerinin sağlanması</li>
            <li>Kampanya ve bilgilendirmelerin iletilmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Kullanıcı deneyiminin iyileştirilmesi</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Veri Güvenliği</h2>
          <p className="text-muted-foreground mb-3">
            Kişisel verileriniz, güvenli sunucularda saklanır ve SSL şifreleme teknolojisi ile korunur.
            Yetkisiz erişime karşı gerekli teknik ve idari tedbirler alınmıştır.
          </p>
          <div className="bg-muted p-4 rounded-lg mt-3">
            <h3 className="font-semibold mb-2">Ödeme Güvenliği</h3>
            <p className="text-muted-foreground text-sm">
              Tüm ödeme işlemleriniz <strong>iyzico</strong> güvenli ödeme altyapısı üzerinden gerçekleştirilmektedir.
              Kredi kartı bilgileriniz hiçbir zaman sistemimizde saklanmaz ve 256-bit SSL şifreleme ile korunur.
              iyzico, PCI-DSS Level 1 sertifikasına sahiptir ve uluslararası güvenlik standartlarına uygundur.
              Ödeme bilgileriniz sadece iyzico sisteminde güvenli bir şekilde işlenir ve saklanır.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Üçüncü Taraf Hizmet Sağlayıcılar</h2>
          <p className="text-muted-foreground mb-2">
            Hizmetlerimizi sunabilmek için aşağıdaki üçüncü taraf hizmet sağlayıcılarla çalışmaktayız:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>iyzico:</strong> Güvenli ödeme işlemleri</li>
            <li><strong>Kargo Firmaları:</strong> Ürün teslimatı (Aras, Yurtiçi, MNG, PTT)</li>
            <li><strong>E-posta Servisleri:</strong> Sipariş ve bilgilendirme e-postaları</li>
            <li><strong>Analitik Araçlar:</strong> Web sitesi performansı ve kullanıcı deneyimi</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Bu hizmet sağlayıcılar verilerinizi sadece hizmet sağlamak amacıyla kullanabilir ve 
            gizlilik taahhüdü altındadır.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Çerezler (Cookies)</h2>
          <p className="text-muted-foreground">
            Web sitemizde kullanıcı deneyimini geliştirmek amacıyla çerezler kullanılmaktadır.
            Tarayıcı ayarlarınızdan çerez kullanımını kontrol edebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Haklarınız</h2>
          <p className="text-muted-foreground mb-2">KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenen verileriniz hakkında bilgi talep etme</li>
            <li>Verilerin işlenme amacını öğrenme</li>
            <li>Yurt içinde/dışında aktarıldığı 3. kişileri bilme</li>
            <li>Verilerin düzeltilmesini veya silinmesini talep etme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. İletişim</h2>
          <p className="text-muted-foreground">
            Gizlilik politikamız hakkında sorularınız için{' '}
            <a href="mailto:bilgi@teknovagroup.com" className="text-primary hover:underline">
              bilgi@teknovagroup.com
            </a>{' '}
            adresinden bizimle iletişime geçebilirsiniz.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>Son Güncellenme: 5 Ocak 2026</p>
        </footer>
      </div>
      </div>
    </>
  )
}
