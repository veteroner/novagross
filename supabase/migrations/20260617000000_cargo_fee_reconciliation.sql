-- Kargo bedeli mutabakatı: MNG faturası kesildikten sonra gerçek kargo ücretini
-- satıcının hak edişinden düş (ücretsiz kargo modeli — satıcı karşılar).
-- Ücret kaynağı: MNG Finance Query getinvoicedetaillist → finalTotal.

-- 1) store_transactions'a 'shipping' tipi ekle
ALTER TABLE public.store_transactions DROP CONSTRAINT IF EXISTS store_transactions_type_check;
ALTER TABLE public.store_transactions ADD CONSTRAINT store_transactions_type_check
  CHECK (type = ANY (ARRAY['sale','commission','withholding','refund','adjustment','payout','deposit','withdrawal','shipping']));

-- 2) order_shipments'a kargo ücreti alanları
ALTER TABLE public.order_shipments
  ADD COLUMN IF NOT EXISTS cargo_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS cargo_fee_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS mng_invoice_number text;

COMMENT ON COLUMN public.order_shipments.cargo_fee IS 'MNG faturasından gelen gerçek kargo ücreti (satıcıdan düşülür)';

-- 3) Kargo ücretini satıcı bakiyesinden düş (idempotent)
CREATE OR REPLACE FUNCTION public.apply_cargo_fee(
  p_order_id uuid,
  p_fee numeric,
  p_invoice_no text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_store_id uuid;
  v_bal numeric;
BEGIN
  IF p_fee IS NULL OR p_fee <= 0 THEN
    RETURN;
  END IF;

  -- Bu sipariş için kargo zaten düşülmüşse atla (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.store_transactions
    WHERE order_id = p_order_id AND type = 'shipping'
  ) THEN
    RAISE NOTICE 'apply_cargo_fee: % zaten işlenmiş, atlanıyor', p_order_id;
    RETURN;
  END IF;

  -- Siparişin mağazası (ilk satıcı kalemi)
  SELECT store_id INTO v_store_id
  FROM public.order_items
  WHERE order_id = p_order_id AND store_id IS NOT NULL
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE NOTICE 'apply_cargo_fee: % için mağaza bulunamadı', p_order_id;
    RETURN;
  END IF;

  INSERT INTO public.store_balance (store_id, pending_balance, available_balance)
  VALUES (v_store_id, 0, 0)
  ON CONFLICT (store_id) DO NOTHING;

  SELECT pending_balance INTO v_bal FROM public.store_balance WHERE store_id = v_store_id;

  -- Kargo bedelini bekleyen bakiyeden düş (gerekirse gelecekteki hak edişe nettir)
  UPDATE public.store_balance
  SET pending_balance = pending_balance - p_fee, updated_at = NOW()
  WHERE store_id = v_store_id;

  INSERT INTO public.store_transactions (
    store_id, order_id, type, amount, balance_before, balance_after, description, is_paid, metadata
  ) VALUES (
    v_store_id, p_order_id, 'shipping',
    -p_fee, v_bal, v_bal - p_fee,
    'Kargo bedeli (MNG faturası)' || COALESCE(' #' || p_invoice_no, ''),
    false,
    jsonb_build_object('mng_invoice_number', p_invoice_no, 'cargo_fee', p_fee)
  );

  -- Gönderi kaydına işle
  UPDATE public.order_shipments
  SET cargo_fee = p_fee, cargo_fee_applied_at = NOW(), mng_invoice_number = p_invoice_no
  WHERE order_id = p_order_id;
END;
$function$;
