-- [restore] Canlıya uygulanmış (supabase_migrations.schema_migrations version 20260613173527,
-- [restore] name ad_balance_functions) ama dosyası repoda yoktu. Aşağıdaki gövde canlıdaki
-- [restore] statements ile birebir aynıdır (md5 doğrulamalı); düzenlemeyin.

-- Reklam bakiyesine kredi ekle (topup/gift/grant/refund) — atomik
CREATE OR REPLACE FUNCTION credit_ad_balance(
  p_store_id uuid,
  p_amount numeric,
  p_type text,
  p_description text DEFAULT NULL,
  p_payment_id text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Tutar pozitif olmalı';
  END IF;

  UPDATE stores SET ad_balance = ad_balance + p_amount, updated_at = now()
  WHERE id = p_store_id
  RETURNING ad_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Mağaza bulunamadı';
  END IF;

  INSERT INTO ad_balance_transactions (store_id, amount, type, description, balance_after, payment_id, created_by)
  VALUES (p_store_id, p_amount, p_type, p_description, v_new_balance, p_payment_id, p_created_by);

  RETURN v_new_balance;
END;
$$;

-- Reklam bakiyesinden harcama düş — atomik, bakiye yetersizse kampanyayı durdur
CREATE OR REPLACE FUNCTION debit_ad_balance(
  p_store_id uuid,
  p_amount numeric,
  p_campaign_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF p_amount <= 0 THEN RETURN NULL; END IF;

  UPDATE stores SET ad_balance = ad_balance - p_amount, updated_at = now()
  WHERE id = p_store_id
  RETURNING ad_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN RETURN NULL; END IF;

  INSERT INTO ad_balance_transactions (store_id, amount, type, description, balance_after, campaign_id)
  VALUES (p_store_id, -p_amount, 'ad_spend', p_description, v_new_balance, p_campaign_id);

  -- Bakiye bittiyse bu mağazanın aktif kampanyalarını durdur
  IF v_new_balance <= 0 THEN
    UPDATE ad_campaigns SET is_active = false
    WHERE store_id = p_store_id AND is_active = true AND status = 'approved';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION credit_ad_balance(uuid,numeric,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION debit_ad_balance(uuid,numeric,uuid,text) FROM PUBLIC, anon, authenticated;
