-- iyzico Pazaryeri Onay Desteği
-- order_items tablosuna iyzico ödeme kırılım bilgilerini ekler.
-- Onay API: POST /payment/iyzipos/item/approve  → paymentTransactionId gerektirir.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS iyzico_payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_approval_status TEXT
    DEFAULT 'pending'
    CHECK (iyzico_approval_status IN ('pending', 'approved', 'disapproved')),
  ADD COLUMN IF NOT EXISTS iyzico_approved_at TIMESTAMPTZ;

-- İndeks: onay bekleyen kalemleri hızlı bulmak için
CREATE INDEX IF NOT EXISTS idx_order_items_iyzico_approval
  ON public.order_items (iyzico_approval_status)
  WHERE iyzico_approval_status = 'pending';

COMMENT ON COLUMN public.order_items.iyzico_payment_transaction_id IS
  'iyzico ödeme kırılım ID (paymentTransactionId). Onay API için gerekli.';
COMMENT ON COLUMN public.order_items.iyzico_approval_status IS
  'iyzico onay durumu: pending | approved | disapproved';
COMMENT ON COLUMN public.order_items.iyzico_approved_at IS
  'iyzico onay/kaldırma tarihi';
