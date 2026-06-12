-- Hukuki onay logu: hangi kullanıcı, hangi sözleşmenin hangi sürümünü,
-- ne zaman, hangi IP'den kabul etti. Kullanıcı kayıt + satıcı başvuru +
-- ödeme akışlarında zorunlu kayıt. Sözleşme sürümü güncellenince eski
-- kabuller geçerli kalır (yasal kanıt), kullanıcı yeniden kabul istenebilir.
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agreement_type TEXT NOT NULL CHECK (agreement_type IN (
    'uyelik_sozlesmesi',
    'kvkk_aydinlatma',
    'acik_riza',
    'cerez_politikasi',
    'gizlilik_politikasi',
    'mesafeli_satis',
    'on_bilgilendirme',
    'pazaryeri_satici_sozlesmesi'
  )),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  store_application_id UUID REFERENCES public.store_applications(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user
  ON public.user_agreements (user_id, agreement_type, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_agreements_order
  ON public.user_agreements (order_id) WHERE order_id IS NOT NULL;

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own agreements" ON public.user_agreements;
CREATE POLICY "Users view own agreements" ON public.user_agreements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manages agreements" ON public.user_agreements;
CREATE POLICY "Admin manages agreements" ON public.user_agreements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

DROP POLICY IF EXISTS "Users insert own agreements" ON public.user_agreements;
CREATE POLICY "Users insert own agreements" ON public.user_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
