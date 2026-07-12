-- MNG kurye/şubeden bildirilen teslimat sorunları (adres bulunamadı, alıcı yok vb.)
-- Plus Query /getShipmentDeliveryProblems ile senkronlanır, admin
-- Plus Command /answerShipmentDeliveryProblem ile onaylar/reddeder.

CREATE TABLE IF NOT EXISTS public.delivery_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_shipment_id uuid REFERENCES public.order_shipments(id) ON DELETE SET NULL,
  mng_shipment_id text NOT NULL,
  mng_problem_id integer NOT NULL,
  reference_id text,
  problem_description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_answer text,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mng_shipment_id, mng_problem_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_problems_status ON public.delivery_problems(status, created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_problems_order ON public.delivery_problems(order_id);

ALTER TABLE public.delivery_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage delivery problems" ON public.delivery_problems;
CREATE POLICY "Admins manage delivery problems" ON public.delivery_problems
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- İrsaliye numarası (billOfLandingId) — Bulk/Finance Query senkronizasyonundan doldurulur
ALTER TABLE public.order_shipments
  ADD COLUMN IF NOT EXISTS bill_of_landing_id text;

COMMENT ON COLUMN public.order_shipments.bill_of_landing_id IS 'MNG irsaliye numarası (billOfLandingId) — Bulk Query/Finance Query senkronizasyonundan doldurulur';
