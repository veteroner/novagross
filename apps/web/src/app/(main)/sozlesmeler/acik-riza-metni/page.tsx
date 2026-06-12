import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ticari Elektronik İleti Açık Rıza Metni | Novagross',
  description: 'Pazarlama amaçlı iletişim için açık rıza metni',
}

export default function AcikRizaMetniPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Ticari Elektronik İleti ve Pazarlama Açık Rıza Metni</h1>
      <p className="text-sm text-gray-500 mb-8">6563 sayılı Kanun ve KVKK kapsamında · Sürüm 2026-06-11</p>

      <article className="prose prose-sm max-w-none">
        <h2>1. Açık Rızanın Konusu</h2>
        <p>
          <strong>Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi</strong> (&quot;Novagross&quot;) tarafından
          işletilen www.novagross.com platformuna üye olduğunuzda, kişisel verilerinizin (ad-soyad,
          e-posta, telefon, alışveriş geçmişi, gezinme verileri) aşağıdaki amaçlarla işlenmesine ve
          tarafınıza ticari elektronik ileti gönderilmesine ilişkin açık rızanız talep edilmektedir.
        </p>

        <h2>2. İşleme Amaçları</h2>
        <ul>
          <li>Kampanya, promosyon, indirim ve fırsatlardan e-posta, SMS, push bildirim ve telefon arama
            yoluyla haberdar edilmeniz.</li>
          <li>Alışveriş geçmişiniz ve ilgi alanlarınız analiz edilerek size özel ürün, kategori ve
            tekliflerin sunulması (profilleme).</li>
          <li>Yeniden hatırlatma e-postaları (sepette unutulan ürünler, fiyat düşüşleri, yeniden stoğa
            giren ürünler).</li>
          <li>Sadakat programı, hediye çeki ve ödül kampanyalarına ilişkin bilgilendirme.</li>
          <li>Müşteri memnuniyeti ve ürün/hizmet kalitesini iyileştirme amaçlı anket ve geri bildirim
            talepleri.</li>
        </ul>

        <h2>3. Hukuki Dayanak</h2>
        <ul>
          <li>6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun m.6: Ticari elektronik
            iletilerin alıcının önceden onayı (açık rıza) ile gönderilebileceği hükmü.</li>
          <li>KVKK 6698 sayılı Kanun m.5/(1): Açık rıza, kişisel veri işleme şartlarından biridir;
            profilleme/pazarlama amaçlı işleme için ayrıca açık rıza gerekir.</li>
          <li>İYS (İleti Yönetim Sistemi): Onaylar İYS&apos;ye kayıtlı tutulur, &quot;ret&quot; talepleri 3 iş günü
            içinde sisteme yansıtılır.</li>
        </ul>

        <h2>4. Aktarım</h2>
        <p>
          Kişisel verileriniz, ticari elektronik ileti gönderim hizmeti (Resend, İYS), pazarlama analitiği
          (yalnızca anonimleştirilmiş veriler) ve pazarlama kampanyası planlama amaçlı hizmet
          sağlayıcılarımız ile paylaşılabilir. Yurt dışına aktarım yapılması halinde KVKK m.9 kapsamında
          gerekli güvenceler sağlanır.
        </p>

        <h2>5. Onayın Geri Alınması</h2>
        <p>
          Açık rızanızı dilediğiniz zaman <strong>geri alabilirsiniz</strong>:
        </p>
        <ul>
          <li>Hesap ayarlarınızdan &quot;Pazarlama izinleri&quot; bölümünden,</li>
          <li>Aldığınız her e-postanın altındaki &quot;Abonelikten çık&quot; bağlantısından,</li>
          <li>SMS&apos;e &quot;RET&quot; yazıp kısa numaraya göndererek,</li>
          <li>bilgi@teknovagroup.com adresine e-posta göndererek,</li>
          <li>İYS (e-Devlet) üzerinden onay yönetiminden.</li>
        </ul>
        <p>
          Onayın geri alınması üyelik sözleşmesini sona erdirmez; yalnızca pazarlama amaçlı iletişim
          durur. Sipariş onayı, kargo bildirimi, iade süreçleri ve hukuki bildirimler ticari elektronik
          ileti kapsamında değildir ve gönderimi devam eder.
        </p>

        <h2>6. Saklama Süresi</h2>
        <p>
          Pazarlama amaçlı işlenen veriler, onayın geri alınmasından itibaren en geç 3 yıl içinde
          silinir; mevzuat gereği saklanması gereken kayıtlar (ör. İYS onay/ret kayıtları) ilgili
          mevzuat süresince saklanır.
        </p>

        <h2>7. Haklarınız</h2>
        <p>
          KVKK m.11 uyarınca veri sorumlusu olarak Novagross&apos;tan; kişisel verilerinizin işlenip
          işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işleme amacını ve bunların
          amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/dışında aktarıldığı üçüncü
          kişileri bilme, eksik/yanlış işlenmiş verilerin düzeltilmesini isteme, silinmesini/imha
          edilmesini isteme ve zarar halinde tazminat talep etme haklarına sahipsiniz.
        </p>

        <h2>8. Onay</h2>
        <p>
          &quot;Ticari elektronik ileti almayı ve pazarlama amaçlı kişisel veri işlemeyi kabul ediyorum&quot;
          kutucuğunu işaretleyerek yukarıdaki şartların tümünü açık rızanızla onaylamış olursunuz.
          Bu rıza zorunlu DEĞİLDİR; işaretlenmemesi üyelik kaydını etkilemez.
        </p>
      </article>
    </div>
  )
}
