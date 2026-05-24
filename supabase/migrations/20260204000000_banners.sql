-- Create banners table for homepage banner/slider
-- This supports iyzico requirement: banner areas should navigate to a product/category.

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('product', 'category', 'page', 'external')),
  link_value TEXT NOT NULL,
  button_text TEXT NOT NULL DEFAULT 'İncele',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active_sort_order
  ON public.banners(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_banners_date_window
  ON public.banners(start_date, end_date);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Public can only see active banners within the optional date window.
DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
CREATE POLICY "Public can view active banners"
ON public.banners
FOR SELECT
USING (
  is_active = true
  AND (start_date IS NULL OR start_date <= NOW())
  AND (end_date IS NULL OR end_date >= NOW())
);

-- Admins can manage banners.
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_banners_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_banners_updated_at_column();

COMMENT ON TABLE public.banners IS 'Homepage banners / slider items. Each banner points to a product/category/page for onboarding compliance.';
