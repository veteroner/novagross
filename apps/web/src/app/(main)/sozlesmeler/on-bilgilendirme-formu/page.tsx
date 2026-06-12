import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ön Bilgilendirme Formu | Novagross',
  description: 'Mesafeli Sözleşmeler Yönetmeliği kapsamında ön bilgilendirme formu',
}

export default function OnBilgilendirmeFormuPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Ön Bilgilendirme Formu</h1>
      <p className="text-sm text-gray-500 mb-8">Mesafeli Sözleşmeler Yönetmeliği m.5 · Sürüm 2026-06-11</p>

      <article className="prose prose-sm max-w-none">
        <h2>1. Satıcı ve Aracı Hizmet Sağlayıcı Bilgileri</h2>
        <p>
          <strong>Aracı hizmet sağlayıcı:</strong> Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi
          (Novagross) · VKN: 8361000730 · E-posta: bilgi@teknovagroup.com
        </p>
        <p>
          <strong>Satıcı:</strong> Sipariş özetinde belirtilen satıcının unvanı, MERSİS/vergi numarası,
          açık adresi, telefonu ve e-postası siparişin onay aşamasında Alıcı&apos;ya gösterilir ve sipariş
          onayında e-posta ile iletilir.
        </p>

        <h2>2. Sözleşme Konusu Ürün/Hizmet Bilgileri</h2>
        <ul>
          <li>Ürünün adı, temel nitelikleri ve adedi sipariş özetinde belirtilmiştir.</li>
          <li>KDV dâhil satış fiyatı, varsa indirim ve kupon tutarı sipariş özetinde gösterilir.</li>
          <li>Kargo bedeli, varsa ücretsiz kargo eşik tutarı sipariş özetinde belirtilir.</li>
          <li>Toplam ödenecek tutar (ürün + kargo − indirim) ödeme öncesi nettir.</li>
        </ul>

        <h2>3. Ödeme Şekli ve Planı</h2>
        <p>
          Ödemeler banka/kredi kartı ile iyzico altyapısı üzerinden yapılır. 3D Secure güvenli ödeme
          zorunludur. Taksit seçenekleri ödeme sayfasında gösterilir. Banka kart bilgileri Novagross
          tarafından saklanmaz.
        </p>

        <h2>4. Teslimat</h2>
        <ul>
          <li>Teslimat, sipariş onayını takiben en geç <strong>30 gün</strong> içinde gerçekleştirilir.</li>
          <li>Teslimat, sipariş esnasında belirtilen adrese anlaşmalı kargo firmalarıyla yapılır.</li>
          <li>Kargo ücreti sipariş özetinde belirtilen tutarda Alıcı tarafından karşılanır
            (ücretsiz kargo eşiği aşıldığında 0 TL).</li>
          <li>Alıcı, teslim aldığı esnada ürünü kontrol etmekle yükümlüdür; hasarlı/eksik ürünleri
            kargo görevlisi nezdinde tutanak ile tespit etmelidir.</li>
        </ul>

        <h2>5. Cayma Hakkı</h2>
        <p>
          Alıcı, hiçbir hukuki ve cezai sorumluluk üstlenmeksizin ve hiçbir gerekçe göstermeksizin
          teslim aldığı tarihten itibaren <strong>14 (on dört) gün</strong> içinde malı reddederek
          sözleşmeden cayma hakkına sahiptir.
        </p>
        <h3>Cayma hakkının kullanılamayacağı haller (MSY m.15):</h3>
        <ul>
          <li>Fiyatı finansal piyasalardaki dalgalanmalara bağlı olan ürünler.</li>
          <li>Alıcı&apos;nın istekleri doğrultusunda kişiselleştirilmiş ürünler.</li>
          <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler.</li>
          <li>Tesliminden sonra ambalaj/koruyucu unsurları açılmış, iadesi sağlık veya hijyen
            açısından uygun olmayan ürünler (kozmetik, iç çamaşırı vb.).</li>
          <li>Tesliminden sonra başka ürünlerle karışan, niteliği itibarıyla iade edilemeyen ürünler.</li>
          <li>Tek kullanımlık ürünler.</li>
          <li>Dijital içerik (Alıcı ifa başlamadan önce onay vermişse).</li>
          <li>Süreli yayınlar (gazete, dergi).</li>
        </ul>

        <h3>Cayma hakkının kullanımı:</h3>
        <p>
          Alıcı, cayma kararını <strong>14 gün içinde</strong> Novagross&apos;a Sipariş Detayları sayfasından
          &quot;İade Talebi Oluştur&quot; butonuyla veya bilgi@teknovagroup.com adresine yazılı bildirimle
          iletir. Mal, anlaşmalı kargo firmasıyla satıcıya iade edilir; iade kargo bedeli mevzuata uygun
          şekilde Alıcı veya Satıcı tarafından karşılanır (sipariş onayı e-postasında belirtilir).
          Ödeme, iadenin Satıcı&apos;ya ulaşmasından itibaren <strong>14 gün</strong> içinde aynı ödeme
          aracına geri yatırılır.
        </p>

        <h2>6. Şikayet ve İtiraz</h2>
        <p>
          Alıcı, Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine başvurabilir. Parasal sınırlar her
          yıl Ticaret Bakanlığı tarafından güncellenir.
        </p>

        <h2>7. Onay</h2>
        <p>
          Alıcı, &quot;Ön Bilgilendirme Formu&apos;nu okudum, anladım&quot; kutucuğunu işaretleyerek bu formdaki tüm
          bilgilerin doğru ve eksiksiz olduğunu, satıcı/aracı hizmet sağlayıcı, ürün, fiyat, ödeme ve
          teslimat koşulları ile cayma hakkı hususlarında bilgilendirildiğini beyan eder.
        </p>
      </article>
    </div>
  )
}
