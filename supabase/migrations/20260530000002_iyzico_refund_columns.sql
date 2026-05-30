-- =====================================================
-- iyzico payment transaction + refund kolon eksiklikleri
-- =====================================================
-- supabase/20260312_iyzico_payment_transaction.sql yanlış konumda
-- (migrations/ yerine root'ta) olduğu için hiç uygulanmamış.
-- Bu migration o kolonları + refund için yeni kolonları ekler.
-- =====================================================

-- order_items: iyzico ödeme kırılım bilgileri (approve/refund API için lazım)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS iyzico_payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_approval_status TEXT
    DEFAULT 'pending'
    CHECK (iyzico_approval_status IN ('pending', 'approved', 'disapproved')),
  ADD COLUMN IF NOT EXISTS iyzico_approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_iyzico_approval
  ON public.order_items (iyzico_approval_status)
  WHERE iyzico_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_order_items_iyzico_txn
  ON public.order_items (iyzico_payment_transaction_id)
  WHERE iyzico_payment_transaction_id IS NOT NULL;

COMMENT ON COLUMN public.order_items.iyzico_payment_transaction_id IS
  'iyzico paymentTransactionId — approve/refund API için zorunlu';

-- return_requests: iyzico refund detayları
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS iyzico_refund_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iyzico_refund_error_code TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_refund_error_message TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_refund_payment_id TEXT;

COMMENT ON COLUMN public.return_requests.iyzico_refund_attempted_at IS
  'iyzico refund API en son ne zaman çağrıldı';
COMMENT ON COLUMN public.return_requests.iyzico_refund_error_code IS
  'iyzico refund hata kodu (başarısızsa)';
COMMENT ON COLUMN public.return_requests.iyzico_refund_payment_id IS
  'iyzico refund.paymentId — başarılı refund response';
