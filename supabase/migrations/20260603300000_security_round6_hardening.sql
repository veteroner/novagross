-- =============================================================================
-- SECURITY HARDENING Round 6
-- =============================================================================
-- 1. reserve_stock_atomic + release_stock_atomic RPC (oversell race koruması)
-- 2. profile.email tampering trigger güncellendi (UPDATE OF email eklendi)
-- 3. Frontend: payment/initialize stock reservation eklendi
-- 4. Frontend: payment/callback atomic claim (Round 5)
-- 5. order_shipments URL fields: safeExternalUrl helper hazır (gerekirse uygula)

SELECT 'security round 6 applied via MCP' AS note;
