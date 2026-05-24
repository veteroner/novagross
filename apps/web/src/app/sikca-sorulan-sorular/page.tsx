import { Metadata } from 'next'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'
import { ShippingCostFaqText } from '@/components/shipping-threshold-text'

export const metadata: Metadata = genMetadata({
  title: 'Sıkça Sorulan Sorular (SSS)',
  description: 'Novagross hakkında merak ettikleriniz. Sipariş, kargo, ödeme, iade ve değişim süreçleri hakkında detaylı bilgi ve cevaplar.',
  keywords: ['sss', 'sık sorulan sorular', 'yardım', 'sipariş takibi', 'iade', 'kargo', 'ödeme'],
  url: '/sikca-sorulan-sorular',
})

export const revalidate = 60 * 60 * 24

export default function SikcaSorulanSorularPage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          name: 'Sıkça Sorulan Sorular',
          description: 'Novagross hakkında merak ettikleriniz. Sipariş, kargo, ödeme, iade ve değişim süreçleri.',
          url: '/sikca-sorulan-sorular',
          dateModified: '2026-01-27',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'SSS', url: '/sikca-sorulan-sorular' },
        ])}
      />

      <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Sıkça Sorulan Sorular</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Sipariş ve Ödeme</h2>
          <div className="space-y-4">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Siparişimi nasıl takip edebilirim?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Siparişinizi "Hesabım" &gt; "Siparişlerim" bölümünden takip edebilirsiniz.
                Ayrıca sipariş durumunuz değiştikçe e-posta ve SMS ile bilgilendirileceksiniz.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Hangi ödeme yöntemlerini kabul ediyorsunuz?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Kredi kartı, banka kartı ve havale/EFT ile ödeme yapabilirsiniz.
                Tüm kredi kartı ödemeleriniz 3D Secure güvenlik sistemi ile korunmaktadır.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Siparişimi iptal edebilir miyim?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Siparişiniz kargoya verilmeden önce iptal edebilirsiniz.
                "Siparişlerim" sayfasından "İptal Et" butonuna tıklayarak iptal işlemini gerçekleştirebilirsiniz.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Fatura kesiliyor mu?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Evet, tüm siparişler için e-fatura kesilmektedir. Faturanız e-posta adresinize gönderilecektir.
                Kurumsal fatura için sipariş sırasında firma bilgilerinizi girmeniz gerekmektedir.
              </p>
            </details>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Kargo ve Teslimat</h2>
          <div className="space-y-4">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Kargo ücreti ne kadardır?
              </summary>
              <ShippingCostFaqText />
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Ne zaman teslim alırım?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Siparişiniz onaylandıktan sonra 1-3 iş günü içinde kargoya verilir.
                Kargo teslimat süresi bölgenize göre 1-5 iş günü arasında değişmektedir.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Hangi kargo firması ile çalışıyorsunuz?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Yurtiçi Kargo, Aras Kargo ve MNG Kargo ile çalışmaktayız.
                Kargo firması siparişiniz hazırlanırken belirlenecektir.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Yurtdışına gönderim yapıyor musunuz?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Şu anda sadece Türkiye içi teslimat yapmaktayız.
                Yakın zamanda yurtdışı gönderim hizmeti sunmayı planlıyoruz.
              </p>
            </details>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">İade ve Değişim</h2>
          <div className="space-y-4">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                İade süresi ne kadardır?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz.
                Detaylı bilgi için{' '}
                <a href="/iade-degisim" className="text-primary hover:underline">
                  İade ve Değişim
                </a>{' '}
                sayfasını inceleyebilirsiniz.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                İade kargo ücreti kim tarafından ödenir?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Cayma hakkı kapsamındaki iadeler için kargo ücreti tarafımızca karşılanmaktadır.
                Size ücretsiz iade kargo kodu gönderilecektir.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                İade sürecim ne kadar sürer?
              </summary>
              <p className="mt-2 text-muted-foreground">
                İade ürününüz tarafımıza ulaştıktan sonra 3 iş günü içinde kontrol edilir.
                Onay sonrası 10 iş günü içinde iade tutarınız hesabınıza aktarılır.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Değişim yapabilir miyim?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Ürün değişimi için önce iade işlemini tamamlamanız, ardından yeni sipariş vermeniz gerekmektedir.
              </p>
            </details>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Üyelik ve Hesap</h2>
          <div className="space-y-4">
            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Üye olmadan alışveriş yapabilir miyim?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Hayır, güvenli alışveriş ve sipariş takibi için üyelik zorunludur.
                Üyelik işlemi hızlı ve ücretsizdir.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Şifremi unuttum, ne yapmalıyım?
              </summary>
              <p className="mt-2 text-muted-foreground">
                Giriş sayfasında "Şifremi Unuttum" linkine tıklayarak e-posta adresinize
                şifre sıfırlama bağlantısı gönderebilirsiniz.
              </p>
            </details>

            <details className="border-b pb-4">
              <summary className="font-semibold cursor-pointer hover:text-primary">
                Üyelik bilgilerimi nasıl güncellerim?
              </summary>
              <p className="mt-2 text-muted-foreground">
                "Hesabım" &gt; "Profil Bilgilerim" sayfasından tüm bilgilerinizi güncelleyebilirsiniz.
              </p>
            </details>
          </div>
        </section>

        <section className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Sorunuz yanıt bulamadınız mı?</h3>
          <p className="text-muted-foreground mb-4">
            Müşteri hizmetlerimiz size yardımcı olmaktan mutluluk duyacaktır.
          </p>
          <a
            href="/iletisim"
            className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90"
          >
            İletişime Geç
          </a>
        </section>
      </div>
      </div>
    </>
  )
}
