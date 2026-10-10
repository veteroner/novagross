import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hesap ve Veri Silme | Novagross',
  description: 'Novagross ve Novagross Satıcı hesaplarının ve ilişkili kişisel verilerin silinmesini talep etme adımları.',
}

export default function AccountDeletionPage() {
  return (
    <main className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-6">Novagross hesap ve veri silme</h1>
      <p className="text-muted-foreground mb-8">
        Bu sayfa Novagross ve Novagross Satıcı uygulamalarını kullanan hesap sahipleri içindir.
        Uygulamayı kaldırmak hesabınızı veya verilerinizi silmez.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Uygulamadan hesap silme</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Novagross uygulamasında hesabınıza giriş yapın.</li>
          <li>Hesabım ekranında hesap silme seçeneğini açın.</li>
          <li>Gösterilen açıklamayı okuyup silme işlemini onaylayın.</li>
        </ol>
        <p className="text-muted-foreground mt-3">
          Açık sipariş veya iade işlemleri tamamlanmadan hesap kapatılamaz.
          Bir mağazaya bağlı hesaplar için aşağıdaki destek yolunu kullanın.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Uygulamaya girmeden talep oluşturma</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>
            <Link href="/iletisim" className="text-primary underline">İletişim formunu</Link>{' '}
            açın veya <a href="mailto:bilgi@teknovagroup.com?subject=Novagross%20hesap%20silme%20talebi" className="text-primary underline">bilgi@teknovagroup.com</a> adresine yazın.
          </li>
          <li>Konuya “Novagross hesap silme talebi” yazın ve hesabınızın e-posta adresini belirtin.</li>
          <li>Hesabınızı ve ilişkili verilerinizi silmek istediğinizi belirtin. Satıcıysanız mağaza adınızı da ekleyin.</li>
        </ol>
        <p className="text-muted-foreground mt-3">
          Şifrenizi veya doğrulama kodunuzu göndermeyin. Hesap sahipliğiniz doğrulandıktan sonra
          talebiniz işleme alınır. Satıcı hesaplarında açık sipariş, iade ve mağaza işlemlerinin
          sonuçlandırılması gerekebilir. Hesabınızı kapatmadan belirli kişisel verilerin silinmesini
          de aynı yoldan talep edebilirsiniz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Silinen ve saklanan veriler</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Müşteri hesabı silindiğinde adresler, sepet, favoriler, bildirimler, bildirim tercihleri, kayıtlı cihazlar ve kampanya kayıtları silinir.</li>
          <li>Profildeki ad, soyad, telefon ve e-posta bilgileri anonimleştirilir; giriş hesabı kapatılır.</li>
          <li>Sipariş ve fatura kayıtları, yayımlanmış KVKK aydınlatma metnimizde belirtilen 10 yıllık saklama süresine tabidir ve hesap silme işlemiyle kaldırılmaz.</li>
          <li>Satıcı hesabına ait mağaza ve ticari kayıtlar, açık işlemler ve saklama yükümlülükleri değerlendirilerek destek tarafından ele alınır.</li>
        </ul>
        <p className="mt-4 text-muted-foreground">
          Ayrıntılar: <Link href="/kvkk" className="text-primary underline">KVKK aydınlatma metni</Link>{' '}
          ve <Link href="/gizlilik-politikasi" className="text-primary underline">gizlilik politikası</Link>.
        </p>
      </section>
    </main>
  )
}
