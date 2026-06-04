-- ============================================================================
-- Fix column naming: compare_price → compare_at_price
-- ============================================================================
-- IMPORTANT: Run this in Supabase SQL Editor BEFORE regenerating types
-- ============================================================================

-- İDEMPOTENT: products eski şemada 'compare_price' ile oluşuyordu; güncel
-- base_schema doğrudan 'compare_at_price' kullanıyor. Sıfırdan kurulumda (DR)
-- kolon zaten doğru isimde → rename'i yalnızca eski kolon varsa uygula.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'compare_price'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN compare_price TO compare_at_price;
  END IF;
END $$;
