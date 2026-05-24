# URGENT: Production Database Column Mismatch Fix

## Problem
Production Supabase database has `compare_price` column, but code expects `compare_at_price`.
This causes 400 errors when fetching products.

## Fix Steps (Run in Supabase SQL Editor)

### 1. Rename the column
```sql
ALTER TABLE products 
  RENAME COLUMN compare_price TO compare_at_price;
```

### 2. Verify the change
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name LIKE '%price%';
```

Should show:
- `price`
- `compare_at_price`
- `cost_price`

### 3. Regenerate TypeScript types (optional, after fix)
```bash
# If you have Supabase CLI locally:
supabase gen types typescript --project-id mdyecmjlxswprbpdtohg > packages/database/src/types.ts

# Or manually download from Supabase Dashboard > API Docs > TypeScript
```

### 4. Verify demo data
```sql
SELECT name, price, compare_at_price 
FROM products 
WHERE is_featured = true 
LIMIT 5;
```

## Files Updated
- ✅ `supabase/migrations/20240101000000_base_schema.sql` - Updated for future consistency
- ✅ `supabase/migrations/20240106000000_demo_data.sql` - Fixed demo data inserts
- ✅ `supabase/migrations/20240107000000_fix_compare_price_column.sql` - Production fix migration

## After Running the Migration
The frontend will immediately start working because the code already uses `compare_at_price`.
