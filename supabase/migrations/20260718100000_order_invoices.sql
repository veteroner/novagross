-- ====================================================================
-- Sipariş Faturaları (Trendyol/HB tarzı satıcı fatura yükleme sistemi)
--
-- Satıcılar kestikleri e-Arşiv faturasını (PDF) kargolamadan itibaren
-- 7 gün içinde yükler; müşteri sipariş detayından indirir.
-- Bir sipariş birden fazla mağazadan ürün içerebileceği için fatura
-- anahtarı (order_id, store_id) çiftidir.
-- ====================================================================

-- --------------------------------------------------------------
-- 1) order_invoices: fatura metadata (dosya private 'invoices'
--    bucket'ında, file_path = storage yolu — URL değil)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf'
    CHECK (mime_type = 'application/pdf'),
  invoice_number TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_order_invoices_store ON order_invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order ON order_invoices(order_id);

ALTER TABLE order_invoices ENABLE ROW LEVEL SECURITY;

-- Satıcı: kendi mağazasının faturalarını yönetir; INSERT'te ek savunma —
-- yalnızca kalemi olduğu siparişe fatura ekleyebilir.
DROP POLICY IF EXISTS "Seller manages own order invoices" ON order_invoices;
CREATE POLICY "Seller manages own order invoices" ON order_invoices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores s
    WHERE s.id = order_invoices.store_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = order_invoices.store_id AND s.owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = order_invoices.order_id
        AND oi.store_id = order_invoices.store_id
    )
  );

-- Müşteri: kendi siparişinin faturalarını görür.
DROP POLICY IF EXISTS "Customer views own order invoices" ON order_invoices;
CREATE POLICY "Customer views own order invoices" ON order_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_invoices.order_id AND o.user_id = auth.uid()
  ));

-- Admin: hepsi.
DROP POLICY IF EXISTS "Admin manages all order invoices" ON order_invoices;
CREATE POLICY "Admin manages all order invoices" ON order_invoices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- --------------------------------------------------------------
-- 2) order_invoice_obligations: "kargolanmış → fatura yükümlülüğü"
--    view'i. due_date = ilk kargolanma + 7 gün. security_invoker
--    sayesinde satıcı/müşteri kendi RLS'iyle, cron service role ile
--    tümünü görür. Satıcı sayacı, admin raporu ve cron aynı kaynaktan
--    beslenir; stored kolon olmadığı için drift oluşmaz.
-- --------------------------------------------------------------
DROP VIEW IF EXISTS order_invoice_obligations;
CREATE VIEW order_invoice_obligations WITH (security_invoker = true) AS
SELECT DISTINCT
  oi.order_id,
  oi.store_id,
  o.order_number,
  o.user_id,
  o.email,
  o.status,
  sh.shipped_at,
  sh.shipped_at + INTERVAL '7 days' AS due_date,
  inv.id AS invoice_id,
  inv.uploaded_at AS invoice_uploaded_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN LATERAL (
  SELECT MIN(os.shipped_at) AS shipped_at
  FROM order_shipments os
  WHERE os.order_id = o.id AND os.shipped_at IS NOT NULL
) sh ON sh.shipped_at IS NOT NULL
LEFT JOIN order_invoices inv
  ON inv.order_id = oi.order_id AND inv.store_id = oi.store_id
WHERE o.status IN ('shipped','delivered');

-- --------------------------------------------------------------
-- 3) invoice_reminder_log: hatırlatma dedup'u — her (sipariş, mağaza,
--    tür) için 1 kez e-posta.
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('upcoming','overdue')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, store_id, kind)
);

ALTER TABLE invoice_reminder_log ENABLE ROW LEVEL SECURITY;
-- Yalnızca service role yazar/okur (cron); kullanıcı policy'si yok.

-- --------------------------------------------------------------
-- 4) 'invoices' storage bucket (private) + satıcı policy'leri.
--    Path deseni: {store_id}/{order_id}/invoice-....pdf
--    Müşteri için storage policy YOK — indirme server-side stream
--    (service role) ile yapılır, her istekte auth doğrulanır.
-- --------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "Seller uploads own invoices" ON storage.objects;
CREATE POLICY "Seller uploads own invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Seller views own invoices" ON storage.objects;
CREATE POLICY "Seller views own invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Seller deletes own invoices" ON storage.objects;
CREATE POLICY "Seller deletes own invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin manages invoice files" ON storage.objects;
CREATE POLICY "Admin manages invoice files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','super_admin')
  )
);
