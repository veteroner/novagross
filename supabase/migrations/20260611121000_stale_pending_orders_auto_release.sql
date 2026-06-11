-- Terkedilen ödemelerde stok iadesi:
-- Kullanıcı iyzico formunu açıp vazgeçerse callback hiç gelmez —
-- reserve edilen stok sonsuza dek bloke kalıyordu. Bu job 10 dakikada bir,
-- 30 dakikadan eski 'pending' siparişleri failed'a çekip stoklarını iade eder.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.release_stale_pending_orders()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_count int := 0;
  r RECORD;
BEGIN
  -- Önce CLAIM (status değişimi atomik) — sonra release.
  -- Bu sıralama callback'le yarışı önler: claim'i kim kazanırsa stoğu o iade eder.
  FOR r IN
    UPDATE public.orders
    SET payment_status = 'failed',
        notes = COALESCE(notes, '') || ' [auto-release: 30dk içinde ödeme tamamlanmadı]'
    WHERE payment_status = 'pending'
      AND created_at < now() - interval '30 minutes'
    RETURNING id
  LOOP
    UPDATE public.products p
    SET stock = p.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = r.id
      AND oi.product_id = p.id
      AND p.stock IS NOT NULL;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_stale_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_stale_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_stale_pending_orders() FROM authenticated;

-- Idempotent schedule (varsa önce kaldır)
DO $$
BEGIN
  PERFORM cron.unschedule('release-stale-pending-orders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'release-stale-pending-orders',
  '*/10 * * * *',
  $$SELECT public.release_stale_pending_orders()$$
);
