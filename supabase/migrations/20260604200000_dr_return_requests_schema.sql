-- =============================================================================
-- DR FIX: return_requests tablosu — migration'larda eksikti (şema gap)
-- =============================================================================
-- Disaster recovery denetiminde bulundu: return_requests canlıda vardı ama
-- hiçbir migration'da CREATE edilmemişti. Sıfırdan kurulumda iade sistemi
-- oluşmazdı. Canlı şemadan çıkarılıp idempotent migration'a alındı.

CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  reason_category text,
  customer_note text,
  evidence_urls text[],
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','refunded','cancelled')),
  refund_amount numeric(12,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  admin_note text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  refunded_at timestamptz,
  iyzico_refund_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  iyzico_refund_attempted_at timestamptz,
  iyzico_refund_error_code text,
  iyzico_refund_error_message text,
  iyzico_refund_payment_id text
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_store ON public.return_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer views own returns" ON public.return_requests;
CREATE POLICY "Customer views own returns" ON public.return_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer creates own returns" ON public.return_requests;
CREATE POLICY "Customer creates own returns" ON public.return_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = return_requests.order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Seller views own store returns" ON public.return_requests;
CREATE POLICY "Seller views own store returns" ON public.return_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = return_requests.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all returns" ON public.return_requests;
CREATE POLICY "Admin manages all returns" ON public.return_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
