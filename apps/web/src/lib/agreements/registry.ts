// Tüm hukuki sözleşmelerin merkezi kaydı.
// Sürüm değişimi: yeni metin yayınlandığında VERSION'u güncelle —
// önceki sürümün kabulleri DB'de yasal kanıt olarak saklı kalır.

export type AgreementType =
  | 'uyelik_sozlesmesi'
  | 'kvkk_aydinlatma'
  | 'acik_riza'
  | 'cerez_politikasi'
  | 'gizlilik_politikasi'
  | 'mesafeli_satis'
  | 'on_bilgilendirme'
  | 'pazaryeri_satici_sozlesmesi'

export const AGREEMENT_VERSION = '2026-06-11'

export const AGREEMENT_META: Record<
  AgreementType,
  { title: string; path: string; required: boolean }
> = {
  uyelik_sozlesmesi: {
    title: 'Üyelik Sözleşmesi',
    path: '/sozlesmeler/uyelik-sozlesmesi',
    required: true,
  },
  kvkk_aydinlatma: {
    title: 'KVKK Aydınlatma Metni',
    path: '/kvkk',
    required: true,
  },
  acik_riza: {
    title: 'Ticari Elektronik İleti / Pazarlama Açık Rıza Metni',
    path: '/sozlesmeler/acik-riza-metni',
    required: false,
  },
  cerez_politikasi: {
    title: 'Çerez Politikası',
    path: '/cerez-politikasi',
    required: false,
  },
  gizlilik_politikasi: {
    title: 'Gizlilik Politikası',
    path: '/gizlilik-politikasi',
    required: true,
  },
  mesafeli_satis: {
    title: 'Mesafeli Satış Sözleşmesi',
    path: '/mesafeli-satis-sozlesmesi',
    required: true,
  },
  on_bilgilendirme: {
    title: 'Ön Bilgilendirme Formu',
    path: '/sozlesmeler/on-bilgilendirme-formu',
    required: true,
  },
  pazaryeri_satici_sozlesmesi: {
    title: 'Pazaryeri Satıcı Sözleşmesi',
    path: '/sozlesmeler/pazaryeri-satici-sozlesmesi',
    required: true,
  },
}
