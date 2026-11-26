# Müşteri akışı kontrol listesi

Tarih: 23 Kasım 2026 · Ortam: Netlify önizlemesi `deploy-preview-20--novagross.netlify.app` (canlı Supabase'e bağlı) · Dal: `claude/musteri-akisi-duzeltmeleri`

Önizleme canlı veritabanını kullandığı için **veri yazan adımlar** (hesap açma, adres kaydı, sipariş, bülten, iletişim formu) burada denenmedi; ayrı bir test hesabıyla ya da test ortamında denenmeli. Supabase test dalı açıldı ama canlı geçiş geçmişinden şemayı kuramadı (92 kaydın 44'ü SQL içermiyor; dalda `products` tablosu bile oluşmadı) ve silindi.

Durum: ✅ geçti · ❌ hata bulundu (bu PR'da düzeltildi) · ⏸ denenmedi (sebep yazılı)

## 1. Kayıt
| Adım | Beklenen | Sonuç |
|---|---|---|
| 8 karakter, sembolsüz şifre (`Deneme12`) | Gönderilmeden "en az 12 karakter, bir sembol" | ✅ Supabase'e istek gitmedi |
| Kural listesi yazarken güncellenir | 5 kural ✓/✗ | ✅ |
| Geçerli şifre (`Kontrol-Listesi-2026!`) | 5 kuralın hepsi ✓ | ✅ |
| Geçerli kayıt | Hesap oluşur, doğrulama e-postası | ⏸ canlıda gerçek hesap açar |
| Eski davranış | "Şifre en az 6 karakter olmalıdır." | ❌ canlıda görüldü (Öner'in denemesi), düzeltildi |
| 375px genişlik | Yatay kaydırma yok, kurallar görünür | ✅ |

## 2. E-posta doğrulama ve giriş sayfası mesajları
| Adım | Beklenen | Sonuç |
|---|---|---|
| `/giris?verified=true` | "E-posta adresiniz doğrulandı…" | ✅ (önce hiçbir şey görünmüyordu) |
| `/giris?error=expired_token` | "…süresi dolmuş…" | ✅ |
| Gerçek doğrulama bağlantısı | Yönlendirme + mesaj | ⏸ gerçek hesap gerekir |

## 3. Giriş
| Adım | Beklenen | Sonuç |
|---|---|---|
| Kayıtlı olmayan e-posta + yanlış şifre | "E-posta veya şifre hatalı." | ✅ |
| Doğru giriş, Google ile giriş, çıkış | — | ⏸ hesap gerekir |

## 4. Şifremi unuttum / sıfırlama
| Adım | Beklenen | Sonuç |
|---|---|---|
| Sıfırlama sayfası kuralları | 12 karakter + 4 sınıf listesi | ✅ (önce "8 karakter, sembolsüz" diyordu) |
| API, zayıf şifre | 400 + kural mesajı | ✅ |
| API, güçlü şifre + geçersiz bağlantı | 400 "Geçersiz veya kullanılmış bağlantı" | ✅ |
| API, Supabase reddi (ör. sızdırılmış şifre) | 400 + anlaşılır mesaj (önce 500 genel hata) | ⏸ birim testiyle doğrulandı |
| Büyük harfli e-postayla talep | E-posta gider | ⏸ gerçek e-posta gönderir; kod düzeltildi (`ilike`) |

## 5–6. Hesabım ve adresler
| Adım | Beklenen | Sonuç |
|---|---|---|
| Telefon `0532 123 45 67` | Kabul edilir, `05321234567` kaydedilir | ⏸ kayıt canlıya yazar; normalleştirme birim testinde ✅ |
| Telefonda "10" geçen numara | Adres kaydı (önce "En fazla 10 adres" hatası) | ❌ düzeltildi; ⏸ uçtan uca |
| Kayıt hatasında varsayılan adres | Korunur (önce siliniyordu) | ❌ düzeltildi; ⏸ uçtan uca |
| Şifre değiştirme | Yeni kural + Türkçe hata (önce ham İngilizce) | ⏸ hesap gerekir |

## 7. Ürünler
| Adım | Beklenen | Sonuç |
|---|---|---|
| Arama `kedi` | Yalnız ilgili ürünler | ✅ |
| Ürün detayı, sepete ekle | Sepete eklenir | ✅ |

## 8. Sepet
| Adım | Beklenen | Sonuç |
|---|---|---|
| Stoğu 1 olan ürünü iki kez ekle | Sepette 1 adet | ✅ (önce sınırsız artıyordu) |
| Sepette + düğmesi stok sınırında | Pasif | ✅ |

## 9. Kupon
| Adım | Beklenen | Sonuç |
|---|---|---|
| `yanliskod` | "Kupon bulunamadı" | ✅ |
| `bilgoo` (küçük harf), bayrak kapalı ortam | "BILGOO kampanyası şu anda açık değil." | ✅ (önce indirim gösterilip ödemede reddediliyordu) |
| BILGOO, bayrak açık, 500 TL altı/üstü, ilk sipariş değil | Doğru mesajlar | ⏸ canlıda bayrak açık ama önizlemede kapalı |
| Kuponun sepetten ödemeye taşınması | Ödemede aynı kupon | ⏸ canlıda geçerli kupon yok |
| Genel kupon doğrulaması | Geçerli kupon kabul | ❌ `validate_coupon_code` ve ödeme başlatma olmayan sütunları (`max_uses`, `min_order_amount`) okuyordu; düzeltildi, geçiş PR'da |

## 10–11. Ödeme
| Adım | Beklenen | Sonuç |
|---|---|---|
| Misafir ödeme sayfası | Adres adımı açılır | ✅ |
| Telefon `0532 123 45` | Satır içi hata, devam pasif | ✅ |
| Telefon `0532 123 45 67` | Hata yok | ✅ |
| `/odeme?error=order_update_failed` | Türkçe açıklama | ❌ mesaj hiç görünmüyordu (belge hazırlama siliyordu); `adbef92` ile düzeltildi, önizlemede ✅ |
| Ücretsiz kargo etiketi | İndirimli tutara göre | ⏸ kupon gerekir; kod düzeltildi |
| Sözleşme belgesi, ödeme formu, sonuç | — | ⏸ giriş + ödeme gerekir |

## 12. Siparişlerim ve iade
| Adım | Beklenen | Sonuç |
|---|---|---|
| Yarım kalmış ödemeler listede | Görünmez | ⏸ hesap gerekir; kod düzeltildi |
| Teslim edilen siparişte iade talebi | "İadelerim"de görünen talep | ⏸ teslim edilmiş sipariş gerekir; bağlantı eklendi |

## 13. Diğer
| Adım | Beklenen | Sonuç |
|---|---|---|
| `/siparis-takip` | `/kargo-takip`'e yönlenir | ✅ (önce 404) |
| `/satici-sozlesmesi` | Pazaryeri satıcı sözleşmesine yönlenir | ✅ (önce 404) |
| 404 sayfası | "Sayfa Bulunamadı" + bağlantılar | ✅ |
| Bülten, iletişim formu gönderimi | Doğru mesaj | ⏸ canlıya yazar / e-posta gönderir |

## Birim testleri
`scripts/tests/musteri-akisi`: 31/31 geçti (şifre kuralı, Supabase hata çevirisi, telefon biçimleri, ödeme hata kodları).

## Bilinen, bu PR'da olmayanlar
- iyzico'ya TC kimlik no sabit `11111111111` gidiyor.
- İki ayrı iade sistemi (`customer_claims` / `return_requests`).
- Canlı geçiş geçmişi eksik: Supabase dalı ve felaket kurtarma için yalnız repo geçişleri güvenilir.
- Mobil mağaza değişikliği mağaza sürümü gerektirir; mobil tip kontrolü çalıştırılmadı.

## İzole smoke testi (GitHub Actions, geçici yerel Supabase)
Çalışma `45241234363`, commit `14111e7`. `supabase start` + 100 repo geçişi, web `PAYMENT_MOCK_MODE=true`; canlı secret ve canlı veritabanı yok. Canlıda olup repo geçişlerinde gövdesi bulunmayan `reserve_stock_atomic`, `release_stock_atomic`, `claim_order_for_payment` canlı katalogdan salt okunur alınıp yalnız test veritabanına fixture olarak yüklendi (`scripts/tests/smoke-local-supabase/prod-functions.fixture.sql`).

| Adım | Sonuç |
|---|---|
| Zayıf şifre Supabase'te reddedilir (`weak_password: length,characters`) | ✅ |
| Güçlü şifreyle kayıt, oturum, profil tetikleyicisi | ✅ |
| Aynı e-postayla tekrar kayıt yeni kimlik açmaz | ✅ |
| Yanlış şifre `invalid_credentials` | ✅ |
| `/kayit`, `/sepet`, `/giris?verified=true`, BILGOO bayrağı | ✅ |
| Geçersiz kupon → "Kupon kodu bulunamadı…" (409 `COUPON_INVALID`) | ✅ |
| BILGOO 240 TL → "…en az 500 TL olmalı." | ✅ |
| BILGOO 600 TL → mock ödeme formu, 100 TL indirim, toplam 500 TL, stok 10→8, hak `reserved` | ✅ |
| Açık BILGOO ödemesi varken ikinci sipariş → "…ilk siparişin ödemesi açık." | ✅ |
| Mock callback başarı → `/siparis-basarili`, sipariş `paid`, hak `paid`, kota 1 | ✅ |
| İlk siparişten sonra BILGOO → "…yalnızca ilk siparişte…" | ✅ |
| Mock callback bilinmeyen sepet → `?error=order_not_found` | ✅ |
| İkinci müşteri, ödeme başarısız → hak `released` | ✅ |

Ret senaryoları özgül mesaj ister; genel stok hatası (`OUT_OF_STOCK`) başarı sayılmaz.
