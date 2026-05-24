-- ============================================================================
-- Fix column naming: compare_price → compare_at_price
-- ============================================================================
-- IMPORTANT: Run this in Supabase SQL Editor BEFORE regenerating types
-- ============================================================================

-- Rename compare_price to compare_at_price in products table
ALTER TABLE products 
  RENAME COLUMN compare_price TO compare_at_price;

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('price', 'compare_at_price', 'cost_price')
ORDER BY column_name;
