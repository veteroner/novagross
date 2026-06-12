import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Üyelik Sözleşmesi | Novagross',
  description: 'Novagross.com üyelik sözleşmesi',
}

export default function UyelikSozlesmesiPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Üyelik Sözleşmesi</h1>
      <p className="text-sm text-gray-500 mb-8">Yürürlük tarihi: 11 Haziran 2026 · Sürüm 2026-06-11</p>

      <article className="prose prose-sm max-w-none">
        <h2>1. Taraflar</h2>
        <p>
          İşbu Üyelik Sözleşmesi (&quot;Sözleşme&quot;), <strong>Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi</strong> (&quot;Novagross&quot; veya &quot;Şirket&quot;)
          ile <strong>www.novagross.com</strong> internet sitesine (&quot;Platform&quot;) üye olan gerçek/tüzel kişi
          (&quot;Üye&quot;) arasında elektronik ortamda akdedilmiştir. Üye, kayıt formundaki &quot;Üyelik Sözleşmesi&apos;ni
          okudum, anladım ve kabul ediyorum&quot; kutucuğunu işaretleyerek bu Sözleşme&apos;nin tüm hükümlerini
          peşinen kabul etmiştir.
        </p>

        <h2>2. Konu</h2>
        <p>
          Sözleşme&apos;nin konusu, Üye&apos;nin Platform&apos;da sunulan hizmetlerden yararlanma şartlarını, tarafların
          hak ve yükümlülüklerini düzenlemektir. 6502 sayılı Tüketicinin Korunması Hakkında Kanun, 6563
          sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve sair ilgili mevzuat hükümleri uygulanır.
        </p>

        <h2>3. Üyelik Şartları</h2>
        <ul>
          <li>Üye, 18 yaşını doldurmuş ve fiil ehliyetine sahip olmalıdır.</li>
          <li>Üyelik bilgileri (ad-soyad, e-posta, telefon, adres) gerçek, güncel ve eksiksiz olmalıdır.</li>
          <li>Üye, hesap erişim bilgilerini gizli tutmakla yükümlüdür; üçüncü kişilerle paylaşamaz.</li>
          <li>Bir kişi yalnızca bir aktif üyeliğe sahip olabilir.</li>
        </ul>

        <h2>4. Üye&apos;nin Hak ve Yükümlülükleri</h2>
        <ul>
          <li>Üye, Platform&apos;u yasalara ve genel ahlak kurallarına uygun şekilde kullanır.</li>
          <li>Diğer üyelerin, satıcıların veya Novagross&apos;un haklarını ihlal eden içerikler paylaşamaz.</li>
          <li>Üyelik hesabıyla yapılan tüm işlemlerden hukuki ve cezai olarak Üye sorumludur.</li>
          <li>Sahte sipariş, ödeme kötüye kullanımı veya yanıltıcı bilgi tespit edilirse üyelik askıya alınır.</li>
        </ul>

        <h2>5. Novagross&apos;un Hak ve Yükümlülükleri</h2>
        <ul>
          <li>Platform&apos;da sunulan hizmetlerin kesintisiz olması için makul çabayı gösterir; teknik
            arıza/bakım nedeniyle geçici kesintilerden sorumlu değildir.</li>
          <li>Sözleşme&apos;ye veya yasaya aykırı hareket eden Üye&apos;nin hesabını önceden bildirim olmaksızın
            askıya alabilir veya silebilir.</li>
          <li>Üye&apos;nin kişisel verilerini KVKK Aydınlatma Metni&apos;nde belirtilen amaçlarla işler.</li>
        </ul>

        <h2>6. Pazaryeri Niteliği ve Sorumluluk</h2>
        <p>
          Novagross 6563 sayılı Kanun anlamında <strong>elektronik ticaret aracı hizmet sağlayıcı</strong>dır.
          Ürünler farklı satıcılar tarafından satışa sunulur; ürünlerin niteliği, ayıbı, teslimatı, faturası
          ile ilgili birincil sorumluluk ilgili satıcıya aittir. Novagross, satıcılar ile alıcılar arasındaki
          uyuşmazlıklarda 6563 ETK m. 9 kapsamında düzenleyici rol oynar.
        </p>

        <h2>7. Fikri Mülkiyet</h2>
        <p>
          Platform üzerindeki tüm yazılım, tasarım, marka, logo ve içerikler Novagross&apos;a veya lisans
          verenlere aittir. Üye, izin almaksızın bu içerikleri kopyalayamaz, dağıtamaz, ticari amaçla
          kullanamaz.
        </p>

        <h2>8. Sözleşmenin Süresi ve Feshi</h2>
        <p>
          Sözleşme, Üye&apos;nin üyelik kaydının tamamlanmasıyla yürürlüğe girer. Üye, profil ayarlarından
          hesabını her zaman kapatabilir. Novagross, Sözleşme&apos;ye aykırılık halinde önceden bildirim
          olmaksızın üyeliği feshedebilir.
        </p>

        <h2>9. Değişiklikler</h2>
        <p>
          Novagross işbu Sözleşme&apos;yi gerekli durumlarda güncelleyebilir. Güncel sürüm Platform&apos;da
          yayımlandığı tarihte yürürlüğe girer; önemli değişikliklerde Üye&apos;nin yeniden onayı istenir.
        </p>

        <h2>10. Uyuşmazlık Çözümü</h2>
        <p>
          Sözleşme&apos;den doğan uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır.
          İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir. Tüketici uyuşmazlıklarında
          ilgili Tüketici Hakem Heyeti veya Tüketici Mahkemesi de yetkili kılınmıştır.
        </p>

        <h2>11. İletişim</h2>
        <p>
          Şirket: Teknova Tarım Hayvancılık Bilişim Reklam Limited Şirketi · VKN: 8361000730 ·
          E-posta: bilgi@teknovagroup.com
        </p>
      </article>
    </div>
  )
}
