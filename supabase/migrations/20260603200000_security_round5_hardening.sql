-- =============================================================================
-- SECURITY HARDENING Round 5 (ACIMASIZ)
-- =============================================================================
-- 1. customer_claims.refund_amount cap — order/item total'ı geçemez
-- 2. claim_order_for_payment(p_order_id, p_payment_id, p_notes) atomic claim
--    (concurrent callback race koruması)
-- 3. Frontend: order email auth.user.email zorlanır (spoofing engellendi)
-- 4. Frontend: storefront featured_product_ids cross-store filter
--    (saldırgan kendi vitrininde başka mağaza ürünü reklam yapamasın)

SELECT 'security round 5 applied via MCP' AS note;
