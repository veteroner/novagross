-- Admin (Platform) Store Setup + Legacy Product Backfill
--
-- What this does:
-- 1) Finds the admin profile by email.
-- 2) Ensures that admin has at least one store (creates a "platform" store if missing).
-- 3) Backfills legacy products with store_id IS NULL to that admin store.
--
-- How to use:
-- - Set admin_email below.
-- - Run in Supabase SQL editor (or psql) with sufficient privileges.

DO $$
DECLARE
  admin_email TEXT := 'veteroner@gmail.com';
  admin_id UUID;
  admin_store_id UUID;

  slug_base TEXT := 'nova-store';
  chosen_slug TEXT;

  name_base TEXT := 'Nova Store';
  chosen_name TEXT;

  n_products_updated INTEGER := 0;
BEGIN
  -- 1) Resolve admin profile
  SELECT p.id
    INTO admin_id
  FROM profiles p
  WHERE p.email IS NOT NULL
    AND lower(p.email) = lower(admin_email)
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found for email: %', admin_email;
  END IF;

  -- 2) If admin already has a store, reuse the oldest one.
  SELECT s.id
    INTO admin_store_id
  FROM stores s
  WHERE s.owner_id = admin_id
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF admin_store_id IS NULL THEN
    -- Choose a unique slug. If the slug exists for another owner, suffix it.
    chosen_slug := slug_base;
    WHILE EXISTS (
      SELECT 1 FROM stores s WHERE s.store_slug = chosen_slug
    ) LOOP
      chosen_slug := slug_base || '-' || floor(random() * 1000000)::INT::TEXT;
    END LOOP;

    -- Choose a unique name (stores_unique_name constraint).
    chosen_name := name_base;
    IF EXISTS (SELECT 1 FROM stores s WHERE s.store_name = chosen_name) THEN
      chosen_name := name_base || ' Platform';
      IF EXISTS (SELECT 1 FROM stores s WHERE s.store_name = chosen_name) THEN
        chosen_name := name_base || ' Platform ' || floor(random() * 1000000)::INT::TEXT;
      END IF;
    END IF;

    INSERT INTO stores (
      owner_id,
      store_name,
      store_slug,
      description,
      email,
      status,
      is_verified,
      verification_badge,
      commission_rate,
      shipping_methods,
      free_shipping_threshold,
      approved_at,
      approved_by
    ) VALUES (
      admin_id,
      chosen_name,
      chosen_slug,
      'Platform/Admin mağazası (legacy ürünler için)',
      admin_email,
      'active',
      true,
      'gold',
      0.00,
      '[]'::jsonb,
      0.00,
      NOW(),
      admin_id
    )
    RETURNING id INTO admin_store_id;

    RAISE NOTICE 'Created admin platform store. id=%, slug=%', admin_store_id, chosen_slug;
  ELSE
    RAISE NOTICE 'Reusing existing admin store. id=%', admin_store_id;
  END IF;

  -- 3) Backfill legacy products
  UPDATE products
  SET store_id = admin_store_id
  WHERE store_id IS NULL;

  GET DIAGNOSTICS n_products_updated = ROW_COUNT;
  RAISE NOTICE 'Backfilled % products to store_id=%', n_products_updated, admin_store_id;

  -- Optional: backfill order_items.store_id for historical orders (uncomment if desired)
  -- UPDATE order_items oi
  -- SET store_id = p.store_id
  -- FROM products p
  -- WHERE oi.product_id = p.id
  --   AND oi.store_id IS NULL
  --   AND p.store_id IS NOT NULL;

END $$;
