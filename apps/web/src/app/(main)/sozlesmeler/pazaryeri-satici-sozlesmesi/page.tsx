import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pazaryeri Satıcı Sözleşmesi | Novagross',
  description: 'Novagross.com pazaryeri satıcı sözleşmesi',
}

export default function PazaryeriSaticiSozlesmesiPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Pazaryeri Satıcı Sözleşmesi</h1>
      <p className="text-sm text-gray-500 mb-8">Yürürlük tarihi: 11 Haziran 2026 · Sürüm 2026-06-11</p>

      <article className="prose prose-sm max-w-none">
        <h2>1. Taraflar</h2>
        <p>
          İşbu Sözleşme, <strong>Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi</strong>
          (&quot;Novagross&quot; veya &quot;Aracı Hizmet Sağlayıcı&quot;) ile www.novagross.com pazaryeri platformunda satış
          yapmak üzere kayıt başvurusunda bulunan gerçek/tüzel kişi (&quot;Satıcı&quot;) arasında elektronik
          ortamda akdedilmiştir.
        </p>

        <h2>2. Tanımlar ve Hukuki Çerçeve</h2>
        <ul>
          <li><strong>Pazaryeri:</strong> Novagross&apos;un işlettiği elektronik ticaret aracı hizmet sağlayıcı platformu.</li>
          <li><strong>Satıcı:</strong> Pazaryeri üzerinden ürün satışı yapan elektronik ticaret hizmet sağlayıcı.</li>
          <li><strong>Yasal çerçeve:</strong> 6563 sayılı E-Ticaret Kanunu, 6502 sayılı TKHK, 6098 sayılı TBK,
            213 sayılı VUK, 7524 sayılı Kanun (e-ticaret stopajı), GVK m.94 ve KVKK 6698.</li>
        </ul>

        <h2>3. Satıcı Yeterlilik Şartları</h2>
        <ul>
          <li>Satıcı, vergi mükellefi (VKN sahibi) gerçek veya tüzel kişi olmalıdır.</li>
          <li>Esnaf muafiyeti talep edilecekse GVK m.9 kapsamında belgeli olmalıdır.</li>
          <li>Türkiye Cumhuriyeti vatandaşı olmalı veya çalışma izni bulunmalıdır.</li>
          <li>Ticaret unvanı, MERSİS numarası, vergi dairesi, IBAN, açık adres ve iletişim bilgileri eksiksiz
            beyan edilmelidir.</li>
          <li>Satıcı, başvurusunu Novagross&apos;un onayına sunar; onay kararı Novagross&apos;un takdirindedir.</li>
        </ul>

        <h2>4. Komisyon ve Ödemeler</h2>
        <ul>
          <li>Novagross, her satıştan kategori bazlı komisyon alır; komisyon oranı satıcı paneli üzerinden
            şeffaf şekilde gösterilir (varsayılan %15, mağaza bazında müzakere edilebilir).</li>
          <li>Komisyon matrahı, satışın KDV hariç tutarıdır.</li>
          <li>Satıcı hakedişi, ürünün <strong>teslim alınmasından itibaren 14 günlük</strong> iade süresi
            sonunda available bakiyeye geçer ve haftalık (Çarşamba) banka transferiyle ödenir.</li>
          <li>İyzico altyapısı kullanılır; ödemeler iyzico marketplace sub-merchant hesabına yatırılır,
            satıcının IBAN&apos;ına aktarılır.</li>
        </ul>

        <h2>5. Vergisel Yükümlülükler</h2>
        <ul>
          <li><strong>%1 e-ticaret stopajı:</strong> 7524 sayılı Kanun ve 23.12.2024 tarihli GİB Tebliği
            uyarınca, 1 Ocak 2025&apos;ten itibaren her satışta KDV hariç tutar üzerinden %1 gelir/kurumlar
            vergisi tevkifatı Novagross tarafından yapılır. Bu tutar aylık Muhtasar ve Prim Hizmet
            Beyannamesi ile GİB&apos;e beyan edilip ödenir; Satıcı bu tutarı kendi vergi beyannamesinde
            mahsup edebilir. Tevkifat belgesi satıcı panelinden indirilebilir.</li>
          <li><strong>Esnaf muafiyeti:</strong> GVK m.9 kapsamında esnaf muaflığı belgesi sunan ve admin
            onayı alan satıcılardan stopaj kesilmez.</li>
          <li><strong>E-Fatura/e-Arşiv:</strong> Satıcı, alıcılara yaptığı satışlar için e-Fatura veya
            e-Arşiv Fatura düzenlemekle yükümlüdür. Novagross, satıcının vergisel yükümlülüklerinden
            sorumlu değildir.</li>
          <li><strong>KDV:</strong> Ürünün KDV oranı satıcı tarafından doğru tanımlanmalıdır; yanlış oran
            kullanımının vergisel sonuçlarından satıcı sorumludur.</li>
        </ul>

        <h2>6. Satıcı&apos;nın Yükümlülükleri</h2>
        <ul>
          <li>Ürün açıklamaları, görselleri, fiyatı ve stoğu doğru ve güncel tutulur.</li>
          <li>Sipariş, sipariş onayından itibaren en geç <strong>3 iş günü</strong> içinde kargoya verilir
            (özel durumlarda en geç 30 gün, 6502 sayılı Kanun&apos;a uygun).</li>
          <li>Marka hakkı, fikri mülkiyet, telif veya gümrük mevzuatına aykırı ürün listelenmez.</li>
          <li>Yasaklı ürünler (silah, ilaç, reçeteli/tıbbi ürün, alkol, kumar vb.) listelenmez.</li>
          <li>Tüketicinin cayma hakkı (14 gün) saygı duyulur ve 14 gün içinde ödeme iade edilir.</li>
          <li>Müşteri sorularına makul sürede (max 24 saat iş günü) yanıt verilir.</li>
          <li>Performans metrikleri (iptal oranı, geç kargo oranı, müşteri memnuniyeti) belirlenen
            eşiklerin altında tutulur — eşik aşımında mağaza askıya alınabilir.</li>
        </ul>

        <h2>7. Novagross&apos;un Hak ve Yükümlülükleri</h2>
        <ul>
          <li>Platform&apos;da satıcı için mağaza, ürün yönetimi, sipariş takibi, kazanç raporu, vergi/stopaj
            takibi ve mesajlaşma araçları sunar.</li>
          <li>Sahte/yanıltıcı içerik, marka ihlali veya tüketici şikayetleri yoğunluğu tespit edilen
            satıcının mağazasını önceden bildirim olmaksızın askıya alabilir veya kapatabilir.</li>
          <li>İade/iptal/tazminat uyuşmazlıklarında 6563 ETK m.9 kapsamında düzenleyici rol oynar.</li>
        </ul>

        <h2>8. Kişisel Veri Koruma</h2>
        <p>
          Satıcı, sipariş kapsamında erişim sağladığı alıcı kişisel verilerini (ad, adres, telefon)
          yalnızca siparişin ifası, kargo ve fatura için kullanır. Pazarlama, profil oluşturma veya üçüncü
          kişilere aktarım için ayrıca açık rıza alınmadan kullanamaz. KVKK 6698 sayılı Kanun ve VERBİS
          yükümlülükleri Satıcı&apos;ya aittir.
        </p>

        <h2>9. Fesih</h2>
        <ul>
          <li>Satıcı, satıcı panelinden veya yazılı bildirimle hesabını her zaman kapatabilir; açık
            siparişlerin teslim edilmesi ve hakediş ödemelerinin tamamlanmasından sonra fesih geçerli olur.</li>
          <li>Novagross, ağır ihlal hallerinde (yasaklı ürün, sahte ürün, tüketici dolandırıcılığı vb.)
            önceden bildirim olmaksızın derhal feshedebilir.</li>
        </ul>

        <h2>10. Uyuşmazlık Çözümü</h2>
        <p>
          Türkiye Cumhuriyeti hukuku uygulanır. İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.
        </p>

        <h2>11. Onay</h2>
        <p>
          Satıcı, satıcı başvuru formunda &quot;Pazaryeri Satıcı Sözleşmesi&apos;ni okudum, anladım ve kabul
          ediyorum&quot; kutucuğunu işaretleyerek bu sözleşmenin tüm hükümlerini kabul etmiştir. Onay kaydı
          IP, kullanıcı ajanı ve zaman damgası ile hukuki kanıt olarak saklanır.
        </p>
      </article>
    </div>
  )
}
