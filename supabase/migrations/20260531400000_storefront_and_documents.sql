-- ====================================================================
-- store_storefront: Mağaza Vitrini (banner + öne çıkan ürünler + tema)
-- ====================================================================
CREATE TABLE IF NOT EXISTS store_storefront (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  banner_url TEXT,
  banner_link TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  about TEXT,
  featured_product_ids UUID[] DEFAULT '{}',
  featured_category_ids UUID[] DEFAULT '{}',
  theme_color TEXT DEFAULT '#16A34A',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_storefront_store ON store_storefront(store_id);

ALTER TABLE store_storefront ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public views published storefronts" ON store_storefront;
CREATE POLICY "Public views published storefronts" ON store_storefront FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Seller manages own storefront" ON store_storefront;
CREATE POLICY "Seller manages own storefront" ON store_storefront FOR ALL
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_storefront.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_storefront.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all storefronts" ON store_storefront;
CREATE POLICY "Admin manages all storefronts" ON store_storefront FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_store_storefront_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_storefront_touch ON store_storefront;
CREATE TRIGGER trg_storefront_touch BEFORE UPDATE ON store_storefront
  FOR EACH ROW EXECUTE FUNCTION public.touch_store_storefront_updated_at();

-- ====================================================================
-- store_documents: Mağaza belgeleri
-- ====================================================================
CREATE TABLE IF NOT EXISTS store_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (
    doc_type IN ('tax_certificate','id_card','contract','signature_circular','trade_registry','other')
  ),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_documents_store ON store_documents(store_id);
CREATE INDEX IF NOT EXISTS idx_store_documents_status ON store_documents(status);

ALTER TABLE store_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seller views own documents" ON store_documents;
CREATE POLICY "Seller views own documents" ON store_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_documents.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Seller uploads own documents" ON store_documents;
CREATE POLICY "Seller uploads own documents" ON store_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_documents.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Seller updates own pending documents" ON store_documents;
CREATE POLICY "Seller updates own pending documents" ON store_documents FOR UPDATE
  USING (status = 'pending' AND EXISTS (SELECT 1 FROM stores s WHERE s.id = store_documents.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_documents.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all documents" ON store_documents;
CREATE POLICY "Admin manages all documents" ON store_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
