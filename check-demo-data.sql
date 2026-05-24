-- Production'da demo data kontrolü için SQL sorguları
-- Bu sorguları Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Super admin var mı?
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'super_admin' 
LIMIT 5;

-- 2. Kategoriler var mı?
SELECT id, name, slug, parent_id, is_active
FROM categories
ORDER BY sort_order;

-- 3. Ürünler var mı?
SELECT id, name, slug, price, stock, is_active, is_featured, approval_status
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- 4. Trendikon (merkezi) mağazası var mı?
SELECT id, store_name, store_slug, status, is_verified
FROM stores
WHERE store_slug = 'nova-store';

-- 5. Toplam sayılar
SELECT 
  (SELECT COUNT(*) FROM categories WHERE is_active = true) as active_categories,
  (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
  (SELECT COUNT(*) FROM stores WHERE status = 'active') as active_stores,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'super_admin')) as admins;
