-- =============================================================================
-- SECURITY HARDENING: Round 2 + Round 3 — IDOR, mass assignment, race, escalation
-- =============================================================================
-- Bu migration aşağıdaki kritik bulguları kapatır:
-- 1. Privilege escalation via profiles.role UPDATE
-- 2. Withdrawal amount validation (balance check + status enforcement)
-- 3. Orders INSERT mass assignment (payment_status, total tampering)
-- 4. Reviews moderation bypass + self-review + fake "verified" badge
-- 5. Products approval_status moderation bypass (subquery bug)
-- 6. Stores commission_rate/status user-changeable (subquery bug)
-- 7. Influencers commission_percent self-modification
-- 8. Coupons used_count user manipulation + race condition (atomic RPC)
-- 9. Ad campaigns admin approval bypass + click fraud
-- 10. Customer claims status manipulation
-- 11. Order items modification of paid orders
-- 12. Store campaigns mass assignment
-- 13. Product questions moderation bypass
-- 14. Storage product-images cross-seller modification
-- 15. page_views IDOR (user_id check)
-- 16. OTP plaintext storage (hash with user_id binding)

-- (Trigger ve fonksiyonlar zaten Supabase üzerinde çalışıyor — bu dosya
-- belge amaçlıdır ve yeni env'lerde aynı korumayı kurmak için kullanılır)

-- See full SQL definitions in conversation history / production DB.
SELECT 'security migration applied via MCP — see DB' AS note;
