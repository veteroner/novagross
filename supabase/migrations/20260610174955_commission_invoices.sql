-- Aylık komisyon faturaları (platform → satıcı)
-- E-Arşiv entegrasyonu için sağlayıcı alanları baştan eklendi (F4 soyutlama).
CREATE TABLE IF NOT EXISTS public.commission_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  invoice_number TEXT UNIQUE,
  -- Tutarlar
  commission_base NUMERIC(12,2) NOT NULL DEFAULT 0,      -- komisyon matrahı (KDV hariç satış toplamı)
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,    -- komisyon (KDV hariç)
  kdv_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,          -- komisyon hizmeti KDV oranı
  kdv_amount NUMERIC(12,2) NOT NULL DEFAULT 0,           -- komisyon KDV'si
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,         -- komisyon + KDV
  total_orders INT NOT NULL DEFAULT 0,
  -- Durum akışı
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'cancelled')),
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  -- E-Arşiv sağlayıcı alanları (F4: adapter doldurur)
  earsiv_provider TEXT,            -- 'mock' | 'birfatura' | 'parasut' | ...
  earsiv_status TEXT NOT NULL DEFAULT 'none'
    CHECK (earsiv_status IN ('none', 'pending', 'sent', 'failed')),
  earsiv_uuid TEXT,                -- sağlayıcı/GİB belge UUID
  earsiv_sent_at TIMESTAMPTZ,
  earsiv_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_period
  ON public.commission_invoices (year, month);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_store
  ON public.commission_invoices (store_id);

ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;

-- Admin her şeyi yönetir
DROP POLICY IF EXISTS "Admin manages commission invoices" ON public.commission_invoices;
CREATE POLICY "Admin manages commission invoices" ON public.commission_invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Satıcı yalnızca kendi KESİLMİŞ (issued) faturalarını görür
DROP POLICY IF EXISTS "Seller views own issued invoices" ON public.commission_invoices;
CREATE POLICY "Seller views own issued invoices" ON public.commission_invoices
  FOR SELECT USING (
    status = 'issued'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = commission_invoices.store_id
        AND s.owner_id = auth.uid()
    )
  );
