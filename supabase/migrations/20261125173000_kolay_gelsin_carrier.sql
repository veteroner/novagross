-- Activate the carrier and method after the service account passes verification.
INSERT INTO public.shipping_carriers (name, code, api_enabled, api_key_required, is_active, display_order)
VALUES ('Kolay Gelsin', 'kolaygelsin', false, true, false, 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.shipping_methods (carrier_id, name, code, is_active)
SELECT id, 'Standart Teslimat', 'kolaygelsin_standard', false
FROM public.shipping_carriers
WHERE code = 'kolaygelsin'
ON CONFLICT (code) DO NOTHING;

-- An indeterminate carrier response must not trigger another work order.
CREATE TABLE IF NOT EXISTS public.kolay_gelsin_dispatches (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kolay_gelsin_dispatches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kolay_gelsin_dispatches FROM anon, authenticated;
GRANT SELECT, INSERT ON public.kolay_gelsin_dispatches TO service_role;
