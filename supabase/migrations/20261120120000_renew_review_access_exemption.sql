-- App Review demo hesabı muafiyetini yenile.
--
-- 20261009200000_review_access_exemptions.sql ile verilen 30 günlük muafiyet
-- 2026-11-08'de doldu; expire_review_access_exemptions() e-posta doğrulamasını
-- geri aldı ve Apple incelemesi (2026-11-20) girişi başaramadı.
-- Kullanıcı onayı (2026-11-20): aynı kapsamla (e-posta doğrulaması + 2FA) 30 gün daha.
-- Bitişte saatlik cron yine her şeyi otomatik geri alır.

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = 'demo@teknovagroup.com';
  IF v_id IS NULL THEN
    RAISE NOTICE 'demo@teknovagroup.com bulunamadı — muafiyet yenilenmedi';
    RETURN;
  END IF;

  UPDATE public.review_access_exemptions
     SET expires_at = now() + interval '30 days',
         revoked_at = NULL,
         confirmed_by_exemption = true,
         note = coalesce(note, '') || ' | 2026-11-20 yenilendi (App Review gecikmesi)'
   WHERE user_id = v_id;

  UPDATE auth.users SET email_confirmed_at = now(), updated_at = now()
   WHERE id = v_id AND email_confirmed_at IS NULL;
END $$;
