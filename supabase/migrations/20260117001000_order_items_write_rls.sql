-- Allow authenticated users to write order_items for their own orders
--
-- This is intentionally narrow: only INSERT/DELETE for rows linked to orders owned by auth.uid().
-- Uses SECURITY DEFINER helper to avoid RLS recursion between orders <-> order_items.

ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- Ensure helper exists (safe if already created)
CREATE OR REPLACE FUNCTION public.can_write_order_items(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.user_id = auth.uid()
  );
END;
$$;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own order items" ON public.order_items';

  EXECUTE 'CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT WITH CHECK (public.can_write_order_items(order_id))';
  EXECUTE 'CREATE POLICY "Users can delete own order items" ON public.order_items FOR DELETE USING (public.can_write_order_items(order_id))';
END $$;
