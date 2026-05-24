-- ARAMA FIX: Ürünlerin approval_status ve is_active durumlarını kontrol et ve düzelt
-- Bu sorgu ile arama çalışmasını engelleyen ürünleri bulup düzeltiyoruz

-- 1) Mevcut durumu incele
SELECT 
  COUNT(*) as toplam_urun,
  COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_urun,
  COUNT(*) FILTER (WHERE is_active = true) as active_urun,
  COUNT(*) FILTER (WHERE approval_status = 'approved' AND is_active = true) as aranabilir_urun,
  COUNT(*) FILTER (WHERE approval_status IS NULL OR approval_status != 'approved') as onaysiz_urun,
  COUNT(*) FILTER (WHERE is_active IS NULL OR is_active = false) as pasif_urun
FROM products;

-- 2) Tüm ürünleri aranabilir yap (approval_status NULL veya farklı olanları approved yap)
UPDATE products
SET 
  approval_status = 'approved',
  is_active = true,
  approved_at = COALESCE(approved_at, NOW()),
  approved_by = COALESCE(approved_by, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1))
WHERE approval_status IS NULL 
   OR approval_status != 'approved'
   OR is_active IS NULL
   OR is_active = false;

-- 3) Sonuç
SELECT 
  COUNT(*) as toplam_urun,
  COUNT(*) FILTER (WHERE approval_status = 'approved' AND is_active = true) as aranabilir_urun
FROM products;
