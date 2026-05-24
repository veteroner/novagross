import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'Novagross kullanım koşulları ve üyelik sözleşmesi',
}

export default function KullanimKosullariPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Kullanım Koşulları</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Genel Hükümler</h2>
          <p className="text-muted-foreground">
            Bu web sitesine erişerek veya siteyi kullanarak, aşağıdaki kullanım koşullarını kabul etmiş sayılırsınız.
            Koşulları kabul etmiyorsanız lütfen siteyi kullanmayınız.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Üyelik ve Hesap Güvenliği</h2>
          <p className="text-muted-foreground mb-2">
            Novagross üyeliği oluşturarak aşağıdakileri kabul etmiş olursunuz:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Kayıt sırasında doğru ve güncel bilgiler vermeyi</li>
            <li>Hesap güvenliğinizi korumayı ve şifrenizi kimseyle paylaşmamayı</li>
            <li>Hesabınızda gerçekleşen tüm aktivitelerden sorumlu olmayı</li>
            <li>18 yaşından büyük olduğunuzu veya yasal vasi onayı aldığınızı</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Sipariş ve Ödeme</h2>
          <p className="text-muted-foreground mb-2">
            Sipariş verdiğinizde şunları kabul etmiş olursunuz:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Ürün fiyatları ve stok durumu değişkenlik gösterebilir</li>
            <li>Siparişiniz onaylandıktan sonra bir satış sözleşmesi oluşur</li>
            <li>Ödeme bilgilerinizin güvenli şekilde işleneceğini</li>
            <li>Kampanya ve indirim kurallarına uyacağınızı</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Teslimat</h2>
          <p className="text-muted-foreground">
            Ürünler, belirtilen teslimat süresi içinde kargo firması aracılığıyla adresinize teslim edilir.
            Teslimat süreleri tahmini olup, öngörülemeyen durumlar nedeniyle değişiklik gösterebilir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. İptal ve İade</h2>
          <p className="text-muted-foreground">
            Tüketici Haklarının Korunması Hakkında Kanun uyarınca, ürünü teslim aldığınız tarihten itibaren
            14 gün içinde cayma hakkınızı kullanabilirsiniz. Detaylı bilgi için{' '}
            <a href="/iade-degisim" className="text-primary hover:underline">İade ve Değişim</a> sayfasını inceleyiniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Fikri Mülkiyet Hakları</h2>
          <p className="text-muted-foreground">
            Site içeriği, logo, tasarım ve diğer tüm materyaller Teknova'ya aittir (Novagross markası kapsamında) ve telif hakkı yasaları
            ile korunmaktadır. İzinsiz kullanılması yasaktır.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Sorumluluk Reddi</h2>
          <p className="text-muted-foreground">
            Ürün açıklamaları mümkün olduğunca doğru hazırlanmıştır, ancak renk tonları ve ölçülerde
            küçük farklılıklar olabilir. Ürün görselleri temsilidir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Değişiklikler</h2>
          <p className="text-muted-foreground">
            Teknova (Novagross), bu kullanım koşullarını önceden haber vermeksizin değiştirme hakkını saklı tutar.
            Güncel koşullar için bu sayfayı düzenli olarak kontrol ediniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Uygulanacak Hukuk ve Yetki</h2>
          <p className="text-muted-foreground">
            Bu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti yasaları uygulanır.
            İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. İletişim</h2>
          <p className="text-muted-foreground">
            Sorularınız için{' '}
            <a href="mailto:info@novagross.com" className="text-primary hover:underline">
              info@novagross.com
            </a>{' '}
            adresinden bizimle iletişime geçebilirsiniz.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>Son Güncellenme: 5 Ocak 2026</p>
        </footer>
      </div>
    </div>
  )
}
