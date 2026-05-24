import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi',
  description: 'Novagross mesafeli satış sözleşmesi ve cayma hakkı bilgileri',
}

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Mesafeli Satış Sözleşmesi</h1>
      
      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. TARAFLAR</h2>
          <div className="text-muted-foreground space-y-2">
            <p><strong>SATICI BİLGİLERİ:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ticari Ünvan: Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi</li>
              <li>Marka: Novagross</li>
              <li>Adres: Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sıncan/Ankara</li>
              <li>E-posta: bilgi@teknovagroup.com</li>
              <li>Web: www.teknovagroup.com</li>
              <li>Vergi Dairesi: Sıncan</li>
              <li>Vergi No: 8961000730</li>
              <li>Ticaret Sicil No: 527879</li>
            </ul>
            <p className="mt-4"><strong>ALICI BİLGİLERİ:</strong></p>
            <p>Sipariş sırasında kayıt edilen bilgiler geçerlidir.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. SÖZLEŞMENİN KONUSU</h2>
          <p className="text-muted-foreground">
            İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait www.teknovagroup.com (Novagross) internet sitesinden 
            elektronik ortamda siparişini yaptığı aşağıda nitelikleri ve satış fiyatı belirtilen 
            ürün/ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması 
            Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak 
            ve yükümlülüklerinin saptanmasıdır.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. SÖZLEŞME KONUSU ÜRÜN/HİZMET BİLGİLERİ</h2>
          <p className="text-muted-foreground">
            Satışa konu ürün/hizmetin temel özelliklerini SATICI'ya ait internet sitesinde 
            yayınlanmaktadır. ALICI, internet sitesinde yer alan ön bilgilendirme ve açıklamaları 
            okuyup bilgi sahibi olduğunu ve elektronik ortamda teyit verdiğini beyan eder.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. GENEL HÜKÜMLER</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              4.1. ALICI, SATICI'ya ait internet sitesinde sözleşme konusu ürünün temel nitelikleri, 
              satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi 
              olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.
            </p>
            <p>
              4.2. Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak kaydı ile her bir ürün için 
              ALICI'nın yerleşim yerinin uzaklığına bağlı olarak internet sitesinde ön bilgiler 
              içinde açıklanan süre içinde ALICI veya gösterdiği adresteki kişi/kuruluşa teslim edilir.
            </p>
            <p>
              4.3. Sözleşme konusu ürün, ALICI'dan başka bir kişi/kuruluşa teslim edilecek ise, 
              teslim edilecek kişi/kuruluşun teslimatı kabul etmemesinden SATICI sorumlu tutulamaz.
            </p>
            <p>
              4.4. SATICI, sözleşme konusu ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere 
              uygun ve varsa garanti belgeleri ve kullanım kılavuzları ile teslim edilmesinden sorumludur.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. FATURA BİLGİLERİ</h2>
          <p className="text-muted-foreground">
            Fatura, sipariş sırasında belirtilen fatura adresine düzenlenir. Fatura, ürün teslimatı 
            sırasında ürünle birlikte veya elektronik posta yoluyla ALICI'ya iletilir.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. CAYMA HAKKI</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              <strong>6.1. Cayma Hakkı Süresi:</strong> ALICI, sözleşme konusu ürünün kendisine 
              veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren 14 (on dört) gün içinde 
              cayma hakkına sahiptir. Cayma hakkının kullanılması için bu süre içinde SATICI'ya 
              yazılı veya kalıcı veri saklayıcısı ile bildirimde bulunulması ve ürünün 6.3 madde 
              hükümleri çerçevesinde kullanılmamış olması şarttır.
            </p>
            <p>
              <strong>6.2. Cayma Hakkının Kullanımı:</strong> Cayma hakkının kullanılması için:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>bilgi@teknovagroup.com adresine e-posta gönderilerek</li>
              <li>Müşteri hizmetleri üzerinden bildirimde bulunarak</li>
              <li>Yazılı olarak satıcı adresine göndererek</li>
            </ul>
            <p className="mt-3">cayma hakkınızı kullanabilirsiniz.</p>
            <p>
              <strong>6.3. Cayma Hakkının Kullanılamayacağı Haller:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Kişisel ihtiyaçlar doğrultusunda hazırlanan ürünler</li>
              <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek mallar</li>
              <li>Tesliminden sonra ambalajı açılmış olan ürünler (hijyen ve sağlık açısından)</li>
              <li>Teslimden sonra başka ürünlerle karışan ve doğası gereği ayrıştırılamayan ürünler</li>
              <li>Abonelik sözleşmesi kapsamında sağlananlar dışında, gazete ve dergi gibi süreli yayınlar</li>
              <li>Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallar</li>
              <li>Ses veya görüntü kayıtları, kitap, dijital içerik, yazılım programları (ambalajı açılmış ise)</li>
            </ul>
            <p>
              <strong>6.4. İade Prosedürü:</strong> Cayma hakkı süresi içinde ürünü kullanmamış ve 
              zarar vermemiş olmanız gerekmektedir. Ürün orijinal ambalajında, eksiksiz ve 
              hasarsız olarak iade edilmelidir. Fatura aslının da ürün ile birlikte gönderilmesi gerekmektedir.
            </p>
            <p>
              <strong>6.5. Bedelin İadesi:</strong> Cayma bildirimi SATICI'ya ulaştığı tarihten 
              itibaren 14 gün içinde ürün bedeli ALICI'ya iade edilir. İade, ALICI'nın ödeme yaptığı 
              yöntemle yapılır (kredi kartı, havale vb.).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. TESLİMAT VE KARGO</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              <strong>7.1. Teslimat Süresi:</strong> Ürünler, siparişin onaylanmasından sonra 
              1-3 iş günü içinde kargoya teslim edilir. Kargo süreci, bölgeye göre 1-7 iş günü 
              arasında değişiklik gösterebilir.
            </p>
            <p>
              <strong>7.2. Kargo Ücreti:</strong> Kargo ücreti ödeme sırasında belirtilir. 
              Belirli tutarın üzerindeki siparişlerde kargo ücretsizdir.
            </p>
            <p>
              <strong>7.3. Teslimat Şartları:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ürünler, adres üzerinde kayıtlı kişiye teslim edilir</li>
              <li>Teslim sırasında ürünün hasarsız olduğundan emin olunmalıdır</li>
              <li>Hasarlı paketler teslim alınmamalı ve tutanak tutulmalıdır</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. ÖDEME VE FATURA</h2>
          <div className="text-muted-foreground space-y-3">
            <p>
              <strong>8.1. Ödeme Yöntemleri:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Kredi Kartı (Visa, MasterCard, Troy)</li>
              <li>Banka Kartı</li>
              <li>iyzico güvenli ödeme sistemi</li>
              <li>Havale/EFT</li>
            </ul>
            <p>
              <strong>8.2. Ödeme Güvenliği:</strong> Tüm ödeme işlemleri 256-bit SSL şifreleme 
              teknolojisi ile korunmaktadır. Kredi kartı bilgileriniz SATICI tarafından 
              saklanmamaktadır.
            </p>
            <p>
              <strong>8.3. Fatura:</strong> Fatura, yasal mevzuata uygun olarak düzenlenir ve 
              ALICI'ya teslim edilir veya elektronik ortamda gönderilir.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. MÜCBİR SEBEPLER</h2>
          <p className="text-muted-foreground">
            Tarafların kontrolü dışında gelişen, önceden öngörülemeyen ve tarafların borçlarını 
            yerine getirmesini engelleyen durumlar mücbir sebep sayılır. Mücbir sebep hallinde, 
            taraflar yükümlülüklerinden sorumlu tutulamaz.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. UYUŞMAZLIKLARIN ÇÖZÜMÜ</h2>
          <p className="text-muted-foreground">
            İşbu sözleşmeden doğabilecek ihtilaflarda; Sanayi ve Ticaret Bakanlığı'nca her yıl 
            Aralık ayında belirlenen parasal sınırlar dahilinde tüketicinin yerleşim yerindeki 
            veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyeti ile Tüketici Mahkemesi 
            yetkilidir.
          </p>
          <p className="text-muted-foreground mt-3">
            Siparişin gerçekleşmesi durumunda ALICI işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. YÜRÜRLÜK</h2>
          <p className="text-muted-foreground">
            İşbu sözleşme, ALICI tarafından okunarak, sipariş verilmesi ile yürürlüğe girer ve 
            taraflar için bağlayıcıdır. Sözleşme toplam 11 (on bir) maddeden oluşmaktadır.
          </p>
        </section>

        <section className="mt-8 pt-6 border-t">
          <p className="text-muted-foreground text-sm">
            <strong>SATICI:</strong> Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi - Novagross<br />
            <strong>TARİH:</strong> Sipariş tarihi<br />
            <strong>ALICI:</strong> Sipariş sırasında kaydedilen bilgiler
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler 
            Yönetmeliği (RG: 27.11.2014/29188) uyarınca düzenlenmiştir.
          </p>
        </section>

        <section className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>CAYMA HAKKI BİLDİRİMİ İÇİN İLETİŞİM:</strong><br />
            E-posta: bilgi@teknovagroup.com<br />
            Web: www.teknovagroup.com<br />
            Müşteri Hizmetleri: www.teknovagroup.com/iletisim
          </p>
        </section>
      </div>
    </div>
  )
}
