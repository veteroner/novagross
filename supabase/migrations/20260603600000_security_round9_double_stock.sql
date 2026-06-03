-- =============================================================================
-- SECURITY HARDENING Round 9 — Double Stock Deduction (KRİTİK)
-- =============================================================================
-- BULGU #32 KRİTİK:
-- decrease_stock_on_payment trigger orders.payment_status='paid' olunca
-- products.stock'u DÜŞÜRÜYORDU. Ama Round 6'da reserve_stock_atomic
-- initialize'da ZATEN düşürmüştü. Sonuç: HER SİPARİŞ STOĞU 2× DÜŞÜRÜYORDU.
--
-- Etki: Saldırgan stock=2 olan ürünü 1 kez sipariş verdiğinde stock=0 oluyor,
--       diğer müşteriler "stokta yok" görüyor → satıcı satış kaybediyor.
--
-- Çözüm:
-- 1. trigger_decrease_stock_on_payment DROP
-- 2. trigger_increase_stock_on_cancel DROP
-- 3. Function'ları no-op'a çevir (geriye uyumluluk)
-- 4. payment/callback fail path'inde release_stock_atomic çağır
-- 5. auto_release_stock_on_cancel: admin orders.status='cancelled' yapınca
--    rezerve stoğu otomatik release et

SELECT 'security round 9 double stock fix applied via MCP' AS note;
