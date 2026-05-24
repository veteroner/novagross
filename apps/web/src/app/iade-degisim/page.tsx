import { Metadata } from 'next'
import { ShippingCostList } from '@/components/shipping-threshold-text'

export const metadata: Metadata = {
  title: 'İade, Değişim ve Teslimat',
  description: 'Novagross iade, değişim koşulları ve teslimat bilgileri',
}

export default function IadeDegisimPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">İade, Değişim ve Teslimat</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        {/* Teslimat Bilgileri */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Teslimat Bilgileri</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Teslimat Süresi</h3>
              <p className="text-muted-foreground">
                Siparişiniz onaylandıktan sonra 1-3 iş günü içinde kargoya teslim edilir. 
                Kargo teslimat süresi bölgeye göre 1-7 iş günü arasında değişiklik gösterebilir.
                Toplam teslimat süresi maksimum 10 iş günüdür.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Kargo Ücreti</h3>
              <ShippingCostList />
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Kargo Firmaları</h3>
              <p className="text-muted-foreground">
                Siparişleriniz Aras Kargo, Yurtiçi Kargo, MNG Kargo ve PTT Kargo ile gönderilmektedir.
                Kargo firması seçimi, teslimat adresinize göre otomatik olarak yapılır.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Teslimat Bölgeleri</h3>
              <p className="text-muted-foreground">
                Türkiye'nin tüm illerine teslimat yapılmaktadır. Bazı uzak bölgelerde teslimat süresi 
                2-3 gün daha uzayabilir.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Kargo Takibi</h3>
              <p className="text-muted-foreground">
                Siparişiniz kargoya verildiğinde size e-posta ve SMS ile kargo takip numarası gönderilir.
                "Hesabım &gt; Siparişlerim" bölümünden de kargo durumunuzu takip edebilirsiniz.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Teslimat Şartları</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Ürünler, sipariş sırasında belirtilen adrese teslim edilir</li>
                <li>Teslimat sırasında kimlik kontrolü yapılabilir</li>
                <li>Paket hasarlı ise teslim alınmamalı ve tutanak tutulmalıdır</li>
                <li>Teslim alınmayan paketler depoya iade edilir ve 3 gün bekletilir</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Cayma Hakkı</h2>
          <p className="text-muted-foreground">
            6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca, ürünü teslim aldığınız tarihten itibaren
            14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkınızı kullanabilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">İade Koşulları</h2>
          <p className="text-muted-foreground mb-2">İade edilecek ürünlerin şu koşulları sağlaması gerekmektedir:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Ürün kullanılmamış, denenmemiş ve hasarsız olmalıdır</li>
            <li>Orijinal ambalajı, etiketleri ve aksesuarları ile birlikte olmalıdır</li>
            <li>Fatura veya iade formu ürünle birlikte gönderilmelidir</li>
            <li>Hijyen ve sağlık açısından uygun olmayan ürünler iade edilemez</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">İade Prosedürü</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">1. İade Talebi Oluşturma</h3>
              <p className="text-muted-foreground">
                Hesabım &gt; Siparişlerim bölümünden iade etmek istediğiniz ürün için "İade Talebi" oluşturun.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">2. Ürünü Paketleme</h3>
              <p className="text-muted-foreground">
                Ürünü orijinal ambalajı ile birlikte güvenli bir şekilde paketleyin ve iade formunu ekleyin.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">3. Kargo İle Gönderim</h3>
              <p className="text-muted-foreground">
                İade kargo ücreti tarafımızdan karşılanacaktır. Kargo kodunuz e-posta ile gönderilecektir.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">4. İnceleme ve Onay</h3>
              <p className="text-muted-foreground">
                Ürün tarafımıza ulaştıktan sonra 3 iş günü içinde kontrol edilir ve onaylanır.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">5. İade Tutarının Ödenmesi</h3>
              <p className="text-muted-foreground">
                İade onaylandıktan sonra 10 iş günü içinde ödeme iadeniz gerçekleştirilir.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Değişim İşlemi</h2>
          <p className="text-muted-foreground mb-2">
            Ürününüzü değiştirmek isterseniz:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>İade prosedürünü takip ederek ürünü iade edin</li>
            <li>Yeni ürün için ayrı bir sipariş oluşturun</li>
            <li>İade tutarınız hesabınıza geçtikten sonra yeni siparişinizi verebilirsiniz</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">İade Edilemeyen Ürünler</h2>
          <p className="text-muted-foreground mb-2">
            Aşağıdaki ürün kategorileri hijyen ve sağlık açısından iade edilemez:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>İç çamaşırı ve mayo</li>
            <li>Kozmetik ve kişisel bakım ürünleri (açılmış olanlar)</li>
            <li>Piercing ve küpe</li>
            <li>Tek kullanımlık ürünler</li>
            <li>Yazılım ve dijital ürünler</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Hasarlı Ürün Teslimatı</h2>
          <p className="text-muted-foreground">
            Eğer ürününüz hasarlı veya kusurlu olarak size ulaştıysa, kargo görevlisinin yanında
            tespit tutanağı tutarak ürünü kabul etmeyiniz. Derhal müşteri hizmetlerimiz ile iletişime geçiniz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">İletişim</h2>
          <p className="text-muted-foreground">
            İade ve değişim işlemleriniz için:{' '}
            <a href="mailto:bilgi@teknovagroup.com" className="text-primary hover:underline">
              bilgi@teknovagroup.com
            </a>
            <br />
            Web: <a href="https://www.teknovagroup.com" className="text-primary hover:underline">www.teknovagroup.com</a>
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>Son Güncellenme: 5 Ocak 2026</p>
        </footer>
      </div>
    </div>
  )
}
