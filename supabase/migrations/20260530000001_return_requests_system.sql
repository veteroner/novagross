-- =====================================================
-- Return Requests System
-- =====================================================
-- Müşterilerin sipariş kalemi bazlı iade talebi açabilmesi,
-- admin'in onay/red verebilmesi, onaylandığında otomatik
-- refund transaction'ı yaratan tam sistem.
--
-- İade kuralları:
--   - Müşteri sadece teslim edilmiş siparişler için talep açabilir
--   - delivered_at + 14 gün içinde olmalı (yasal süre)
--   - Admin onaylarsa: store_transactions'a refund eklenir
--     ve eğer satıcıya henüz ödenmemişse pending_balance'tan düşer
--   - Refund tutarı = order_item.seller_amount kadar
-- =====================================================

CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN (
    'defective', 'wrong_item', 'not_as_described', 'damaged_in_shipping',
    'changed_mind', 'late_delivery', 'other'
  )),
  customer_note TEXT,
  evidence_urls TEXT[], -- müşteri fotoğraf ekleyebilir (opsiyonel)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'refunded', 'cancelled'
  )),
  refund_amount NUMERIC(12,2),
  admin_note TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  refunded_at TIMESTAMPTZ,
  iyzico_refund_id TEXT, -- iyzico'dan dönen refund transaction id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_store ON public.return_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created ON public.return_requests(created_at DESC);

COMMENT ON TABLE public.return_requests IS 'Müşteri iade talepleri ve admin onay süreçleri';

-- ============================================================
-- updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS update_return_requests_updated_at ON public.return_requests;
CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Validate: müşteri sadece kendi siparişi için, 14 gün içinde
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_return_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- Order ve item kontrolü
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sipariş bulunamadı';
  END IF;

  SELECT * INTO v_item FROM public.order_items WHERE id = NEW.order_item_id AND order_id = NEW.order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sipariş kalemi bu siparişe ait değil';
  END IF;

  -- Sipariş bu kullanıcının mı?
  IF v_order.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Bu sipariş size ait değil';
  END IF;

  -- Sipariş teslim edildi mi?
  IF v_order.status <> 'delivered' OR v_order.delivered_at IS NULL THEN
    RAISE EXCEPTION 'Sadece teslim edilmiş siparişler için iade talep edebilirsiniz';
  END IF;

  -- 14 gün içinde mi?
  IF v_order.return_deadline IS NOT NULL AND v_order.return_deadline < NOW() THEN
    RAISE EXCEPTION '14 günlük yasal iade süresi dolmuş';
  END IF;

  -- Aynı item için zaten bekleyen veya onaylanmış talep var mı?
  IF EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE order_item_id = NEW.order_item_id
      AND status IN ('pending', 'approved', 'refunded')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Bu ürün için zaten bir iade talebiniz var';
  END IF;

  -- Quantity sipariş edilenden fazla olamaz
  IF NEW.quantity > v_item.quantity THEN
    RAISE EXCEPTION 'İade adedi sipariş adedinden fazla olamaz';
  END IF;

  -- store_id ve refund_amount otomatik doldur
  IF NEW.store_id IS NULL THEN
    NEW.store_id := v_item.store_id;
  END IF;

  IF NEW.refund_amount IS NULL THEN
    NEW.refund_amount := v_item.price * NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_return_request_trigger ON public.return_requests;
CREATE TRIGGER validate_return_request_trigger
  BEFORE INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_return_request();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- Customer: kendi taleplerini görür ve oluşturur
DROP POLICY IF EXISTS "Users can view own return requests" ON public.return_requests;
CREATE POLICY "Users can view own return requests"
  ON public.return_requests FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can create own return requests" ON public.return_requests;
CREATE POLICY "Users can create own return requests"
  ON public.return_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Customer: pending durumdayken iptal edebilir
DROP POLICY IF EXISTS "Users can cancel pending return requests" ON public.return_requests;
CREATE POLICY "Users can cancel pending return requests"
  ON public.return_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- Seller: kendi mağazasının iadelerini görür
DROP POLICY IF EXISTS "Sellers can view their store return requests" ON public.return_requests;
CREATE POLICY "Sellers can view their store return requests"
  ON public.return_requests FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- Admin: full access
DROP POLICY IF EXISTS "Admins can manage all return requests" ON public.return_requests;
CREATE POLICY "Admins can manage all return requests"
  ON public.return_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- approve_return_request: onay süreci + refund transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_return_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_sale_tx RECORD;
  v_current_balance NUMERIC(12,2);
  v_new_balance NUMERIC(12,2);
BEGIN
  -- Admin kontrolü
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler iade talebi onaylayabilir';
  END IF;

  SELECT * INTO v_request FROM public.return_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'İade talebi bulunamadı';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Bu talep zaten % durumunda', v_request.status;
  END IF;

  -- İlgili sale transaction'ı bul (varsa)
  SELECT * INTO v_sale_tx
  FROM public.store_transactions
  WHERE order_id = v_request.order_id
    AND order_item_id = v_request.order_item_id
    AND type = 'sale'
  LIMIT 1;

  -- Store_balance güncelle (eğer satıcıya henüz ödenmemişse pending'den düş)
  IF v_sale_tx IS NOT NULL AND NOT v_sale_tx.is_paid THEN
    SELECT pending_balance INTO v_current_balance
      FROM public.store_balance WHERE store_id = v_request.store_id;

    v_new_balance := GREATEST(COALESCE(v_current_balance, 0) - v_sale_tx.amount, 0);

    UPDATE public.store_balance
    SET
      pending_balance = v_new_balance,
      updated_at = NOW()
    WHERE store_id = v_request.store_id;

    -- Sale transaction'ı iptal et (payout edilmesin diye)
    UPDATE public.store_transactions
    SET
      is_paid = true,  -- "completed" but as cancelled — kuyruğa girmez
      description = description || ' [İade onaylandı: ' || p_request_id::text || ']'
    WHERE id = v_sale_tx.id;
  ELSIF v_sale_tx IS NOT NULL AND v_sale_tx.is_paid THEN
    -- Satıcı zaten ödendi → manuel takip gerekli, sadece refund kaydı oluştur
    v_current_balance := COALESCE(
      (SELECT pending_balance FROM public.store_balance WHERE store_id = v_request.store_id),
      0
    );
    v_new_balance := v_current_balance;
  ELSE
    v_current_balance := 0;
    v_new_balance := 0;
  END IF;

  -- Refund transaction kaydı
  INSERT INTO public.store_transactions (
    store_id, order_id, order_item_id, type,
    amount, balance_before, balance_after,
    description, metadata
  ) VALUES (
    v_request.store_id, v_request.order_id, v_request.order_item_id, 'refund',
    -COALESCE(v_sale_tx.amount, v_request.refund_amount),
    v_current_balance,
    v_new_balance,
    'İade onaylandı (talep #' || p_request_id::text || ')',
    jsonb_build_object(
      'return_request_id', p_request_id,
      'reason', v_request.reason,
      'reason_category', v_request.reason_category,
      'seller_already_paid', COALESCE(v_sale_tx.is_paid, false)
    )
  );

  -- Talebi güncelle
  UPDATE public.return_requests
  SET
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    admin_note = p_admin_note
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'refund_amount', COALESCE(v_sale_tx.amount, v_request.refund_amount),
    'seller_was_paid', COALESCE(v_sale_tx.is_paid, false),
    'iyzico_refund_required', true
  );
END;
$$;

-- ============================================================
-- reject_return_request
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_return_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler iade talebi reddedebilir';
  END IF;

  SELECT * INTO v_request FROM public.return_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'İade talebi bulunamadı';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Bu talep zaten % durumunda', v_request.status;
  END IF;

  UPDATE public.return_requests
  SET
    status = 'rejected',
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    rejection_reason = p_rejection_reason
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id
  );
END;
$$;

-- ============================================================
-- mark_return_refunded: iyzico refund tamamlandığında çağrılır
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_return_refunded(
  p_request_id UUID,
  p_iyzico_refund_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler iadeyi tamamlayabilir';
  END IF;

  UPDATE public.return_requests
  SET
    status = 'refunded',
    refunded_at = NOW(),
    iyzico_refund_id = p_iyzico_refund_id
  WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Onaylanmış iade talebi bulunamadı';
  END IF;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$;
