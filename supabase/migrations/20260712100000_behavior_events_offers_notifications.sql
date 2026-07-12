-- Davranış izleme + hedefli teklif + site içi bildirim altyapısı
-- 1) product_events: ürün görüntüleme / sepete ekleme-çıkarma / favori olayları
-- 2) product_offers(+recipients): satıcının ilgilenen alıcılara kupon teklifi (KVKK: satıcı kimlik görmez)
-- 3) user_notifications: alıcıya site içi bildirim (header zili)
-- 4) get_product_interest / get_offer_recipients: satıcı içgörü + hedefleme fonksiyonları

-- ============ 1) product_events ============
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','add_to_cart','remove_from_cart','favorite','unfavorite')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_product ON public.product_events(product_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_product_events_store ON public.product_events(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_product_events_user ON public.product_events(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
-- Yazma yalnızca service role (API route'ları); istemci rollerine policy YOK.
DROP POLICY IF EXISTS "Admins read product events" ON public.product_events;
CREATE POLICY "Admins read product events" ON public.product_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- ============ 2) product_offers ============
CREATE TABLE IF NOT EXISTS public.product_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  audience text NOT NULL DEFAULT 'interested' CHECK (audience IN ('abandoned_cart','interested','favorited')),
  valid_days integer NOT NULL DEFAULT 7 CHECK (valid_days BETWEEN 1 AND 30),
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_offers_store ON public.product_offers(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON public.product_offers(product_id, created_at);

ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owner reads own offers" ON public.product_offers;
CREATE POLICY "Store owner reads own offers" ON public.product_offers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.product_offer_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.product_offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code text,
  notified_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_recipients_user ON public.product_offer_recipients(user_id);
-- KVKK: satıcı alıcı kimliklerini GÖRMEZ — istemci rollerine hiç policy yok (yalnız service role).
ALTER TABLE public.product_offer_recipients ENABLE ROW LEVEL SECURITY;

-- ============ 3) user_notifications ============
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 4) İçgörü + hedefleme fonksiyonları ============
-- Satıcı ürün ilgisi (son p_days gün): görüntülenme, sepete ekleme, favori,
-- ilgilenen tekil kullanıcı, sepette bırakan (satın almamış) kullanıcı, satış adedi.
CREATE OR REPLACE FUNCTION public.get_product_interest(p_store_id uuid, p_days int DEFAULT 30)
RETURNS TABLE (
  product_id uuid, name text, slug text, price numeric,
  views bigint, cart_adds bigint, favorites bigint,
  interested_users bigint, abandoned_users bigint, purchases bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH ev AS (
    SELECT e.* FROM product_events e
    WHERE e.store_id = p_store_id
      AND e.created_at > now() - make_interval(days => p_days)
  ),
  buyers AS (
    SELECT DISTINCT o.user_id, oi.product_id
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id = p_store_id AND o.payment_status = 'paid' AND o.user_id IS NOT NULL
  ),
  sales AS (
    SELECT oi.product_id, count(*) AS cnt
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id = p_store_id AND o.payment_status = 'paid'
      AND o.created_at > now() - make_interval(days => p_days)
    GROUP BY oi.product_id
  )
  SELECT
    p.id, p.name, p.slug, p.price,
    count(*) FILTER (WHERE ev.event_type = 'view')                            AS views,
    count(*) FILTER (WHERE ev.event_type = 'add_to_cart')                     AS cart_adds,
    count(*) FILTER (WHERE ev.event_type = 'favorite')                        AS favorites,
    count(DISTINCT ev.user_id) FILTER (
      WHERE ev.user_id IS NOT NULL
        AND ev.event_type IN ('view','add_to_cart','favorite'))               AS interested_users,
    count(DISTINCT ev.user_id) FILTER (
      WHERE ev.user_id IS NOT NULL AND ev.event_type = 'add_to_cart'
        AND b.user_id IS NULL)                                                AS abandoned_users,
    COALESCE(max(s.cnt), 0)                                                   AS purchases
  FROM products p
  LEFT JOIN ev ON ev.product_id = p.id
  LEFT JOIN buyers b ON b.product_id = ev.product_id AND b.user_id = ev.user_id
  LEFT JOIN sales s ON s.product_id = p.id
  WHERE p.store_id = p_store_id
  GROUP BY p.id
  ORDER BY cart_adds DESC, views DESC;
$$;

-- Teklif alıcıları: ürünle ilgilenmiş, hâlâ satın almamış, oturumlu kullanıcılar.
CREATE OR REPLACE FUNCTION public.get_offer_recipients(p_product_id uuid, p_audience text DEFAULT 'interested', p_days int DEFAULT 30)
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT DISTINCT e.user_id
  FROM product_events e
  WHERE e.product_id = p_product_id
    AND e.user_id IS NOT NULL
    AND e.created_at > now() - make_interval(days => p_days)
    AND (
      CASE p_audience
        WHEN 'abandoned_cart' THEN e.event_type = 'add_to_cart'
        WHEN 'favorited'      THEN e.event_type = 'favorite'
        ELSE e.event_type IN ('view','add_to_cart','favorite')
      END
    )
    AND NOT EXISTS (
      SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = p_product_id AND o.user_id = e.user_id AND o.payment_status = 'paid'
    );
$$;

-- Bu fonksiyonlar veri sızdırabilir → yalnızca service role çağırır.
REVOKE EXECUTE ON FUNCTION public.get_product_interest(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_offer_recipients(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_interest(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_offer_recipients(uuid, text, int) TO service_role;
