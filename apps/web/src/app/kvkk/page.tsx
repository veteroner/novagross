import { Card } from '@novagross/ui'
import type { Metadata } from 'next'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'

export const metadata: Metadata = genMetadata({
  title: 'KVKK Aydınlatma Metni',
  description: 'Novagross Kişisel Verilerin Korunması Kanunu (KVKK) aydınlatma metni. 6698 sayılı kanun kapsamında kişisel verilerinizin işlenmesi hakkında bilgilendirme.',
  keywords: ['kvkk', 'kişisel veriler', 'gizlilik', 'veri koruma', 'aydınlatma metni'],
  url: '/kvkk',
})

export const revalidate = 60 * 60 * 24

export default function KVKKPage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          name: 'KVKK Aydınlatma Metni',
          description: 'Novagross Kişisel Verilerin Korunması Kanunu (KVKK) aydınlatma metni.',
          url: '/kvkk',
          dateModified: '2026-01-28',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'KVKK', url: '/kvkk' },
        ])}
      />

      <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">KVKK Aydınlatma Metni</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Veri Sorumlusu</h2>
          <p className="text-muted-foreground">
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz; veri sorumlusu olarak Teknova tarafından (Novagross markası kapsamında) aşağıda açıklanan kapsamda işlenebilecektir.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">2. Kişisel Verilerin İşlenme Amacı</h2>
          <p className="text-muted-foreground mb-4">
            Toplanan kişisel verileriniz aşağıdaki amaçlarla işlenebilecektir:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Üyelik işlemlerinin gerçekleştirilmesi</li>
            <li>Sipariş ve teslimat süreçlerinin yönetilmesi</li>
            <li>Müşteri hizmetlerinin sunulması</li>
            <li>Ürün ve hizmetlerimiz hakkında bilgilendirme yapılması</li>
            <li>Kampanya ve promosyon faaliyetlerinin yürütülmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Güvenlik ve dolandırıcılık önleme faaliyetlerinin yürütülmesi</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">3. İşlenen Kişisel Veriler</h2>
          <p className="text-muted-foreground mb-4">
            Platformumuz üzerinden işlenen kişisel veriler şunlardır:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Kimlik Bilgileri: Ad, soyad, doğum tarihi, T.C. kimlik numarası</li>
            <li>İletişim Bilgileri: Telefon numarası, e-posta adresi, adres</li>
            <li>Müşteri İşlem Bilgileri: Sipariş bilgileri, ödeme bilgileri, fatura bilgileri</li>
            <li>İşlem Güvenliği Bilgileri: IP adresi, çerez kayıtları, oturum bilgileri</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">4. Kişisel Verilerin Aktarılması</h2>
          <p className="text-muted-foreground mb-4">
            Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Kargo ve lojistik şirketlerine</li>
            <li>Ödeme kuruluşlarına ve bankalara</li>
            <li>İş ortaklarımıza</li>
            <li>Hukuki yükümlülüklerimiz gereği yetkili kamu kurum ve kuruluşlarına</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            aktarılabilecektir. Verileriniz KVKK'nın öngördüğü temel ilkelere uygun olarak ve gerekli güvenlik önlemleri alınarak aktarılmaktadır.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
          <p className="text-muted-foreground mb-4">
            Kişisel verileriniz, web sitemiz, mobil uygulamamız, çağrı merkezimiz, mağazalarımız ve diğer kanallar aracılığıyla; otomatik ya da otomatik olmayan yöntemlerle, sözlü, yazılı veya elektronik ortamda toplanmaktadır.
          </p>
          <p className="text-muted-foreground">
            Bu veriler, KVKK'nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları ve amaçları kapsamında işlenmektedir.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">6. Kişisel Veri Sahibinin Hakları</h2>
          <p className="text-muted-foreground mb-4">
            KVKK'nın 11. maddesi uyarınca, kişisel veri sahipleri olarak aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
            <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
            <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
            <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
            <li>Düzeltme, silme veya yok edilme işlemlerinin kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
            <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">7. Başvuru Yöntemi</h2>
          <p className="text-muted-foreground mb-4">
            Yukarıda belirtilen haklarınızı kullanmak için kimliğinizi tespit edici gerekli bilgiler ve kullanmak istediğiniz hakkınıza yönelik açıklamalarınızla birlikte talebinizi aşağıdaki yöntemlerle Teknova'ya (Novagross) iletebilirsiniz:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>E-posta: bilgi@teknovagroup.com</li>
            <li>Posta: Mevlana Mah. 432 Cad. No: 8 İç Kapı No: 23 Sıncan/Ankara</li>
            <li>İletişim formu üzerinden</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Başvurularınız, talebin niteliğine göre en kısa sürede ve en geç 30 (otuz) gün içinde ücretsiz olarak sonuçlandırılacaktır. İşlemin ayrıca bir maliyet gerektirmesi halinde, Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret alınabilir.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">8. Veri Güvenliği</h2>
          <p className="text-muted-foreground mb-4">
            Novagross olarak, kişisel verilerinizin güvenliğini sağlamak için aşağıdaki teknik ve idari tedbirleri almaktayız:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>SSL/TLS şifreleme ile güvenli veri iletimi (256-bit şifreleme)</li>
            <li>Güvenli sunucu altyapısı ve düzenli güvenlik güncellemeleri</li>
            <li>Yetkisiz erişimi engelleyen erişim kontrol sistemleri</li>
            <li>Güvenlik duvarı ve saldırı tespit sistemleri</li>
            <li>Düzenli güvenlik denetimleri ve zafiyet taramaları</li>
            <li>Personel eğitimleri ve gizlilik sözleşmeleri</li>
            <li>Veri yedekleme ve felaket kurtarma planları</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">9. Kişisel Verilerin Saklanma Süresi</h2>
          <p className="text-muted-foreground mb-4">
            Kişisel verileriniz, işlenme amaçları için gerekli olan süre boyunca ve yasal saklama yükümlülüklerine uygun olarak saklanmaktadır:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Üyelik Bilgileri:</strong> Üyeliğin sona ermesinden itibaren 10 yıl (Vergi Usul Kanunu)</li>
            <li><strong>Sipariş ve Fatura Bilgileri:</strong> 10 yıl (Türk Ticaret Kanunu, Vergi Usul Kanunu)</li>
            <li><strong>İletişim Kayıtları:</strong> 3 yıl (Tüketicinin Korunması Hakkında Kanun)</li>
            <li><strong>Pazarlama İzinleri:</strong> İzin geri çekilene kadar veya en fazla 5 yıl</li>
            <li><strong>Çerez Verileri:</strong> Çerez tipine göre 1 ay - 2 yıl arası</li>
            <li><strong>Güvenlik Logları:</strong> 2 yıl (Elektronik Ticaretin Düzenlenmesi Hakkında Kanun)</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Saklama süresinin sona ermesi veya işleme amacının ortadan kalkması durumunda kişisel verileriniz silinir, yok edilir veya anonim hale getirilir.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">10. Çerez Kullanımı</h2>
          <p className="text-muted-foreground mb-4">
            Web sitemizde, kullanıcı deneyimini iyileştirmek ve analiz yapmak amacıyla çerezler kullanılmaktadır. Çerez politikamız hakkında detaylı bilgi için{' '}
            <a href="/cerez-politikasi" className="text-primary hover:underline">
              Çerez Politikası
            </a>{' '}
            sayfasını ziyaret edebilirsiniz.
          </p>
          <p className="text-muted-foreground">
            Tarayıcı ayarlarınızdan çerezleri yönetebilir, zorunlu olmayan çerezleri reddedebilirsiniz. Ancak bazı çerezlerin reddedilmesi, web sitesinin bazı işlevlerinin çalışmamasına neden olabilir.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">11. Otomatik Karar Alma ve Profilleme</h2>
          <p className="text-muted-foreground mb-4">
            Platformumuzda, kullanıcı deneyimini kişiselleştirmek amacıyla otomatik karar alma ve profilleme faaliyetleri gerçekleştirilebilmektedir:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Ürün Önerileri:</strong> Gezinme geçmişi ve satın alma davranışlarınıza göre kişiselleştirilmiş ürün önerileri</li>
            <li><strong>Fiyatlandırma:</strong> Dinamik fiyatlandırma uygulanmamaktadır</li>
            <li><strong>Pazarlama:</strong> İlgi alanlarınıza göre özelleştirilmiş kampanya ve promosyonlar</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Otomatik karar alma süreçlerine itiraz etme hakkınız bulunmaktadır. İtirazınızı yukarıdaki başvuru yöntemleri ile iletebilirsiniz.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">12. Çocukların Gizliliği</h2>
          <p className="text-muted-foreground mb-4">
            Platformumuz, 18 yaşından küçük çocuklara yönelik değildir. 18 yaşından küçük kişilerden bilerek kişisel veri toplamıyoruz.
          </p>
          <p className="text-muted-foreground">
            Eğer bir ebeveyn veya vasi olarak, çocuğunuzun rızası olmadan kişisel verilerini paylaştığını düşünüyorsanız, lütfen bizimle iletişime geçin. Bu tür verileri derhal sileceğiz.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">13. Değişiklikler</h2>
          <p className="text-muted-foreground">
            Bu KVKK Aydınlatma Metni, yasal düzenlemeler ve şirket politikalarımızdaki değişiklikler doğrultusunda güncellenebilir. Önemli değişiklikler olduğunda, e-posta veya web sitesi üzerinden bilgilendirileceksiniz. Güncelleme tarihi aşağıda belirtilmiştir.
          </p>
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Son Güncelleme:</strong> 28 Ocak 2026
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Bu aydınlatma metni, KVKK ve ilgili mevzuatta yapılabilecek değişiklikler uyarınca güncellenebilir. Güncel metin her zaman web sitemizde yayımlanacaktır.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>İletişim:</strong> Kişisel verileriniz ile ilgili her türlü soru, öneri ve şikayetleriniz için{' '}
            <a href="/iletisim" className="text-primary hover:underline">iletişim sayfamızı</a> ziyaret edebilirsiniz.
          </p>
        </div>
      </div>
      </div>
    </>
  )
}
