# 🚨 ACİL SORUNLAR VE ÇÖZÜM PLANI

Tarih: 17 Ocak 2026

## 📋 MEVCUT DURUM ANALİZİ

### 1. SQL Script Hatası ❌
**Sorun:** `safe_rls_fix.sql` çalıştırıldığında policy zaten var hatası alınıyor
```
ERROR: 42710: policy "Store owners can view own store" for table "stores" already exists
```

**Sebep:** Script idempotent olmalı ama DROP POLICY IF EXISTS çalışmıyor çünkü bazı policy'ler farklı isimlerle var

**Çözüm:**
1. Mevcut tüm policy'leri manuel olarak kaldır
2. Fresh bir RLS kurulumu yap

---

### 2. Sipariş Onaylanamıyor ❌
**Sorun:** Admin panelinde siparişleri onaylayamıyorsunuz

**Muhtemel Sebepler:**
1. ✅ **Admin kullanıcısı yok** - Veritabanında admin role'üne sahip profile yok
2. ✅ **Ürünler store'a atanmamış** - Demo ürünlerde `store_id` NULL olabilir
3. ✅ **RLS blokluyor** - is_admin() fonksiyonu doğru çalışmıyor olabilir

**Bulgu:** 
- `seed.sql` dosyasında admin kullanıcısı oluşturulmuyor
- `seed-demo-data.sql` var ama admin eklenmiyor
- Demo ürünler mağazalara atanmış ANCAK mevcut seed.sql'de store_id YOK

---

### 3. Satıcı Paneli Eksik ⚠️
**ÇOK ÖNEMLİ BULGU:**

**Durum:**
- `KALAN_ISLER.md` dosyasına göre "Faz 3: Satıcı Paneli ✅ TAMAMLANDI" yazıyor
- ANCAK `/apps/satici` klasörü YOK!
- Sadece `/apps/admin`, `/apps/web`, `/apps/mobile` var

**Gerçek:**
Satıcı paneli muhtemelen web app içinde route olarak yapılmış (/satici/*), ayrı app değil

---

## 🎯 ACİL ÇÖZÜM PLANI

### FAZ 1: VERİTABANI DÜZELTMELERİ (15 dk) 🔥

#### Adım 1.1: Admin Kullanıcısı Oluştur
```sql
-- 1. Admin email'inizi kullanarak admin profili oluşturun
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'BURAYA_EMAIL_ADRESİNİZİ_YAZIN';

-- Doğrulama
SELECT id, email, role, first_name FROM profiles WHERE role = 'admin';
```

#### Adım 1.2: Tüm RLS Policy'lerini Temizle ve Yeniden Oluştur
```sql
-- TEMİZLİK - Tüm politikaları kaldır
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('orders', 'order_items', 'email_queue', 'payments', 'profiles', 'stores', 'store_applications')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;
```

**SONRA** `safe_rls_fix.sql`'in sadece PART 2, 3, 4 bölümlerini çalıştır

---

### FAZ 2: DEMO VERİLERİNİ DÜZELT (10 dk)

#### Adım 2.1: Demo Store ve Seller Oluştur
Bu işlem için `seed-demo-data.sql` kullanılabilir ANCAK önce mevcut durumu kontrol et:

```sql
-- Mevcut store'ları kontrol et
SELECT store_name, store_slug, owner_id, status FROM stores;

-- Mevcut ürünlerin store atamasını kontrol et
SELECT 
    p.name,
    p.store_id,
    s.store_name
FROM products p
LEFT JOIN stores s ON s.id = p.store_id
LIMIT 10;
```

**Eğer ürünler store'a atanmamışsa:**
```sql
-- Trendikon'u bul veya oluştur
INSERT INTO stores (
    store_name, 
    store_slug, 
    description,
    status,
    commission_rate,
    owner_id
) VALUES (
    'Trendikon',
    'nova-store',
    'Platform resmi mağazası',
    'active',
    0.00,
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (store_slug) DO NOTHING
RETURNING id;

-- Tüm orphan ürünleri Trendikon'a ata
UPDATE products 
SET store_id = (SELECT id FROM stores WHERE store_slug = 'nova-store')
WHERE store_id IS NULL;
```

---

### FAZ 3: SATICI PANELİNİ KONTROL ET (5 dk)

#### Adım 3.1: Satıcı Rotalarını Kontrol Et
Web app içinde satıcı paneli olup olmadığını kontrol et:

```bash
# Satıcı rotalarını ara
find apps/web/src/app -type f -name "*.tsx" | grep -i satici
find apps/web/src/app -type d -name "satici"
```

#### Adım 3.2: Satıcı Paneline Erişim
Eğer varsa:
- `/satici/dashboard` - Satıcı ana sayfa
- `/satici/urunler` - Ürün yönetimi
- `/satici/siparisler` - Sipariş yönetimi
- `/satici/finans` - Finansal işlemler

**Test için:**
1. Demo seller kullanıcısı oluştur
2. Profilde `is_seller = true` yap
3. Store oluştur
4. Satıcı paneline giriş yap

---

### FAZ 4: EMAIL SİSTEMİNİ KONTROL ET (5 dk)

#### Adım 4.1: Resend Domain Doğrulama
```
1. https://resend.com/domains adresine git
2. trendikon.com domain'ini ekle
3. DNS kayıtlarını ekle (SPF, DKIM, DMARC)
4. Doğrulamayı bekle
```

#### Adım 4.2: Email Queue Test
```sql
-- Email queue'ya yazılabiliyor mu kontrol et
SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5;

-- Başarısız emailler var mı
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 ÖNCELİK SIRASI

### 🔴 ÇOK ACİL (Hemen yapılmalı)
1. ✅ **Admin kullanıcısı oluştur** - Yoksa hiçbir şey yönetilemez
2. ✅ **RLS policy temizliği** - Şu anki hata çözülmeli
3. ✅ **Ürünleri store'a ata** - Yoksa siparişler çalışmaz

### 🟡 ORTA (Bugün içinde)
4. ⏳ **Satıcı panelini lokalize et** - Nerede olduğunu bul
5. ⏳ **Demo seller oluştur** - Test için gerekli
6. ⏳ **Email domain doğrula** - Email gönderimleri için

### 🟢 DÜŞÜK (Bu hafta)
7. ⏳ **Email template'leri ekle** - Sipariş bildirimleri vs
8. ⏳ **Admin paneline seller approval ekle** - Satıcı başvuruları için

---

## 🛠️ HEMEN ŞİMDİ YAPILACAKLAR

### ADIM 1: Admin Yetkilendirmesi
```sql
-- Email adresinizi buraya yazın
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@example.com';
```

### ADIM 2: Policy Temizliği
```sql
-- Önce mevcut policy'leri görelim
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('stores', 'orders', 'profiles')
ORDER BY tablename, policyname;
```

Bu query'nin sonucuna göre DROP komutları hazırlarız.

### ADIM 3: Store Kontrolü
```sql
-- Mevcut store durumu
SELECT 
    s.store_name,
    s.store_slug,
    s.status,
    COUNT(p.id) as product_count,
    p.owner_id,
    prof.email as owner_email
FROM stores s
LEFT JOIN products p ON p.store_id = s.id
LEFT JOIN profiles prof ON prof.id = s.owner_id
GROUP BY s.id, s.store_name, s.store_slug, s.status, p.owner_id, prof.email;
```

---

## ❓ ARAŞTIRMA SORULARI

1. **Hangi email adresi ile giriş yapıyorsunuz?**
   - Bu kullanıcıyı admin yapmamız gerekiyor

2. **Supabase'de şu an hangi migration'lar çalışmış?**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

3. **Mevcut ürünlerde store_id var mı?**
   ```sql
   SELECT COUNT(*) as total, 
          COUNT(store_id) as with_store,
          COUNT(*) - COUNT(store_id) as orphan
   FROM products;
   ```

4. **Demo veriler yüklendi mi?**
   ```sql
   SELECT COUNT(*) FROM stores WHERE store_slug != 'nova-store';
   ```

---

## 🎬 İLK ADIM

**ŞİMDİ YAPILACAK:**

1. Email adresinizi söyleyin → Admin yapacağım
2. Supabase SQL Editor'ı açın → Hazırlanan query'leri çalıştıracağız
3. Mevcut durumu kontrol edeceğiz → Policy ve store durumu

Bu bilgilerle doğru çözümü uygulayabiliriz!
