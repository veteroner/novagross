-- ============================================================================
-- Update validate_product trigger to use compare_at_price
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate price
  IF NOT validate_price(NEW.price) THEN
    RAISE EXCEPTION 'Price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate compare price (UPDATED: compare_price → compare_at_price)
  IF NEW.compare_at_price IS NOT NULL AND NOT validate_price(NEW.compare_at_price) THEN
    RAISE EXCEPTION 'Compare price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate cost price
  IF NEW.cost_price IS NOT NULL AND NOT validate_price(NEW.cost_price) THEN
    RAISE EXCEPTION 'Cost price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate stock
  IF NOT validate_stock(NEW.stock) THEN
    RAISE EXCEPTION 'Stock must be between 0 and 1,000,000';
  END IF;
  
  -- Sanitize text fields
  NEW.name := sanitize_text(NEW.name);
  NEW.description := sanitize_text(NEW.description);
  NEW.meta_title := sanitize_text(NEW.meta_title);
  NEW.meta_description := sanitize_text(NEW.meta_description);
  
  -- Normalize slug
  NEW.slug := normalize_slug(NEW.slug);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
