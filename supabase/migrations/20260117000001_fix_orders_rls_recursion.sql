-- Fix: RLS infinite recursion between orders <-> order_items policies
-- Problem:
--   orders SELECT policy (seller view) queries order_items,
--   order_items SELECT policy (user view) queries orders,
--   leading to: "infinite recursion detected in policy for relation \"orders\""
-- Solution:
--   Move cross-table checks into SECURITY DEFINER functions (table-owner),
--   so they can evaluate without invoking RLS policies recursively.

-- Ensure RLS enabled (idempotent)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: can current user view items for an order?
CREATE OR REPLACE FUNCTION public.can_view_order_items(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.user_id = auth.uid()
  );
$$;

-- SECURITY DEFINER helper: can current seller view this order (has items in own store)?
CREATE OR REPLACE FUNCTION public.can_seller_view_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND public.owns_store(oi.store_id)
  );
$$;

-- Replace policies to avoid recursion
DO $$
BEGIN
  -- ORDERS
  EXECUTE 'DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON public.orders';
  EXECUTE 'CREATE POLICY "Sellers can view orders containing their products" ON public.orders FOR SELECT USING (public.can_seller_view_order(id))';

  -- ORDER ITEMS
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items';
  EXECUTE 'CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (public.can_view_order_items(order_id))';
END
$$;
