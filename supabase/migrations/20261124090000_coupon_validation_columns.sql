-- Kupon doğrulaması gerçek sütunlarla: coupons tablosunda max_uses yok, kullanım sınırı
-- usage_limit'tir. Önceki fonksiyon geçerli bir kuponda c.max_uses'a erişip hata
-- veriyordu (müşteri "Doğrulama hatası" görüyordu). Ayrıca indirim tavanı
-- (maximum_discount) istemciye döner, böylece sepette gösterilen indirim ödemeyle aynı olur.
DROP FUNCTION IF EXISTS public.validate_coupon_code(text, numeric);

CREATE FUNCTION public.validate_coupon_code(p_code text, p_subtotal numeric)
RETURNS TABLE(is_valid boolean, discount_type text, discount_value numeric, minimum_amount numeric,
              free_shipping boolean, reason text, maximum_discount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c RECORD;
BEGIN
  SELECT * INTO c FROM public.coupons
  WHERE upper(code) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::numeric, false, 'Kupon bulunamadı'::text, NULL::numeric;
    RETURN;
  END IF;
  IF NOT c.is_active THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::numeric, false, 'Kupon devre dışı'::text, NULL::numeric;
    RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::numeric, false, 'Kupon süresi doldu'::text, NULL::numeric;
    RETURN;
  END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::numeric, false, 'Kupon henüz aktif değil'::text, NULL::numeric;
    RETURN;
  END IF;
  IF c.usage_limit IS NOT NULL AND COALESCE(c.used_count, 0) >= c.usage_limit THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::numeric, false, 'Kupon kullanım limitine ulaşıldı'::text, NULL::numeric;
    RETURN;
  END IF;
  IF c.minimum_amount IS NOT NULL AND p_subtotal < c.minimum_amount THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, c.minimum_amount, false,
      format('Minimum %s TL alışveriş gerekli', c.minimum_amount), NULL::numeric;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, c.discount_type::text, c.discount_value, c.minimum_amount,
    COALESCE(c.free_shipping, false), NULL::text, c.maximum_discount;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon_code(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon_code(text, numeric) TO anon, authenticated, service_role;
