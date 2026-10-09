-- Mağaza incelemesi (Apple App Review / Google Play) demo hesabı için SÜRELİ erişim muafiyetleri.
--
-- Kullanıcı onayı (2026-10-09): yalnızca demo@teknovagroup.com hesabı, 30 gün,
-- e-posta doğrulaması + satıcı 2FA'sından muaf. Kalıcı işaretleme yerine:
--   • Muafiyet kullanıcının kimliğine (user_id) bağlı, bitiş tarihli satır.
--   • E-posta doğrulaması: muafiyet anında doğrulanmış sayılır; bitişte
--     expire_review_access_exemptions() doğrulamayı GERİ ALIR (yalnızca muafiyetin
--     kendisi doğruladıysa) ve satırı kapatır → hesap tekrar e-posta doğrulaması ister.
--   • 2FA: apps/seller isTwoFactorExempt(userId) bu tabloyu okur (service role).
-- Tabloya istemciler erişemez (RLS açık, politika yok).

CREATE TABLE IF NOT EXISTS public.review_access_exemptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_verification boolean NOT NULL DEFAULT false,
  two_factor boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  confirmed_by_exemption boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE public.review_access_exemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_access_exemptions FROM anon, authenticated;
GRANT SELECT ON public.review_access_exemptions TO service_role;

COMMENT ON TABLE public.review_access_exemptions IS
  'Mağaza incelemesi demo hesabı için süreli e-posta doğrulaması / 2FA muafiyeti. Yalnızca sahibin onayıyla, demo hesaplar için.';

-- Süresi dolanları kapat; muafiyetin yaptığı e-posta doğrulamasını geri al.
CREATE OR REPLACE FUNCTION public.expire_review_access_exemptions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.review_access_exemptions
    WHERE revoked_at IS NULL AND expires_at <= now()
    FOR UPDATE
  LOOP
    IF r.email_verification AND r.confirmed_by_exemption THEN
      UPDATE auth.users SET email_confirmed_at = NULL, updated_at = now() WHERE id = r.user_id;
    END IF;
    UPDATE public.review_access_exemptions SET revoked_at = now() WHERE user_id = r.user_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.expire_review_access_exemptions() FROM PUBLIC, anon, authenticated;

-- Saatlik bitiş kontrolü
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-review-access-exemptions';
  PERFORM cron.schedule('expire-review-access-exemptions', '7 * * * *', 'select public.expire_review_access_exemptions()');
END $$;

-- Onaylanan tek hesap: demo@teknovagroup.com, 30 gün
DO $$
DECLARE v_id uuid; v_was_confirmed boolean;
BEGIN
  SELECT id, email_confirmed_at IS NOT NULL INTO v_id, v_was_confirmed
  FROM auth.users WHERE lower(email) = 'demo@teknovagroup.com';
  IF v_id IS NULL THEN
    RAISE NOTICE 'demo@teknovagroup.com bulunamadı — muafiyet eklenmedi';
    RETURN;
  END IF;

  INSERT INTO public.review_access_exemptions (user_id, email_verification, two_factor, expires_at, confirmed_by_exemption, note)
  VALUES (v_id, true, true, now() + interval '30 days', NOT v_was_confirmed,
          'App Store / Google Play inceleme demo hesabı — sahip onayı 2026-10-09')
  ON CONFLICT (user_id) DO NOTHING;

  IF NOT v_was_confirmed THEN
    UPDATE auth.users SET email_confirmed_at = now(), updated_at = now() WHERE id = v_id AND email_confirmed_at IS NULL;
  END IF;
END $$;
