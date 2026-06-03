-- =============================================================================
-- SECURITY HARDENING Round 10 — Defense in depth, stock release paths
-- =============================================================================
-- BULGU #33 (potansiyel): trigger_decrease_stock_on_order AFTER INSERT ON order_items
--   sadece orders.payment_status='paid' iken çalışıyor. Initialize'da pending
--   olduğundan tetiklenmiyor → çift düşüş yok. ✅
--   Yine de gelecekte güvenlik için izlenmeli.
--
-- ROUND 10 DÜZELTMELERİ:
-- 1. payment/callback amount_mismatch path → release_stock_atomic çağrısı
--    (disputed order'lar için stok orphan kalmayacak)
-- 2. enforce_order_items_integrity quantity/price/total pozitif zorla (Round 8)
--    çalışıyor — UPDATE commission_amount test edildi, trigger engelliyor ✅

SELECT 'round 10 release paths applied' AS note;
