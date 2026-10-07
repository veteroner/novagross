-- =====================================================
-- Ürün değişiklik TASLAKLARI — eski hal yayında kalır
-- =====================================================
-- Trendyol/Hepsiburada gibi: satıcı ONAYLI bir ürünün içeriğini değiştirdiğinde
-- değişiklik ürün satırına yazılmaz, products.pending_changes taslağına alınır;
-- canlı (eski) hal mağazada görünmeye devam eder. Admin taslağı onaylarsa
-- uygulanır, reddederse canlı hal aynen kalır ve satıcı nedenini görür.
--
-- Önceki migration (20261007130000) içerik değişikliğinde ürünü 'pending'e
-- düşürüp yayından kaldırıyordu — onaylı ürünler için bunun yerini alır.
-- Henüz onaylanmamış (pending) ürün doğrudan düzenlenir; reddedilmiş ürün
-- düzenlenince yeniden onaya gider (değişmedi).
--
-- Taslak şekli:
--   { "name": ..., "slug": ..., "description": ..., "category_id": ..., "brand": ...,
--     "barcode": ..., "meta_title": ..., "meta_description": ..., "is_digital": ...,
--     "images_add": [{ "url", "alt_text" }], "images_remove": ["<product_images.id>"] }
-- Fiyat/stok/SKU/ağırlık/ölçü/is_active gibi operasyonel alanlar onaysız, doğrudan.
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pending_changes jsonb,
  ADD COLUMN IF NOT EXISTS pending_changes_status text CHECK (pending_changes_status IN ('pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS pending_changes_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_changes_reason text;
CREATE INDEX IF NOT EXISTS idx_products_pending_changes ON public.products (pending_changes_at)
  WHERE pending_changes_status = 'pending';

COMMENT ON COLUMN public.products.pending_changes IS 'Onaylı ürünün admin onayı bekleyen içerik değişiklikleri (taslak); canlı alanlar değişmez';

-- ---------- Ürün satırı ----------
CREATE OR REPLACE FUNCTION public.enforce_product_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Görsel/varyant trigger'ları ve taslak RPC'leri bu bayrakla geçer
    IF current_setting('novagross.moderation_reapprove', true) = 'on' THEN
      RETURN NEW;
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'approval_status sadece admin tarafından değiştirilebilir' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'approved_by sadece admin tarafından set edilir' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'approved_at sadece admin tarafından set edilir' USING ERRCODE = '42501';
    END IF;
    IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
      RAISE EXCEPTION 'Ürün başka mağazaya taşınamaz' USING ERRCODE = '42501';
    END IF;
    IF NEW.stock IS NOT NULL AND NEW.stock < 0 THEN
      RAISE EXCEPTION 'Stok negatif olamaz' USING ERRCODE = '22023';
    END IF;

    -- Taslak kolonlarını satıcı doğrudan yazamaz (yalnızca aşağıdaki hesap / RPC'ler)
    NEW.pending_changes := OLD.pending_changes;
    NEW.pending_changes_status := OLD.pending_changes_status;
    NEW.pending_changes_at := OLD.pending_changes_at;
    NEW.pending_changes_reason := OLD.pending_changes_reason;

    IF OLD.approval_status = 'approved' THEN
      -- Canlı ürün: içerik değişikliği taslağa, canlı alan eski haliyle kalır
      IF NEW.name IS DISTINCT FROM OLD.name THEN v_changes := v_changes || jsonb_build_object('name', NEW.name); NEW.name := OLD.name; END IF;
      IF NEW.slug IS DISTINCT FROM OLD.slug THEN v_changes := v_changes || jsonb_build_object('slug', NEW.slug); NEW.slug := OLD.slug; END IF;
      IF NEW.description IS DISTINCT FROM OLD.description THEN v_changes := v_changes || jsonb_build_object('description', NEW.description); NEW.description := OLD.description; END IF;
      IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN v_changes := v_changes || jsonb_build_object('category_id', NEW.category_id); NEW.category_id := OLD.category_id; END IF;
      IF NEW.brand IS DISTINCT FROM OLD.brand THEN v_changes := v_changes || jsonb_build_object('brand', NEW.brand); NEW.brand := OLD.brand; END IF;
      IF NEW.barcode IS DISTINCT FROM OLD.barcode THEN v_changes := v_changes || jsonb_build_object('barcode', NEW.barcode); NEW.barcode := OLD.barcode; END IF;
      IF NEW.meta_title IS DISTINCT FROM OLD.meta_title THEN v_changes := v_changes || jsonb_build_object('meta_title', NEW.meta_title); NEW.meta_title := OLD.meta_title; END IF;
      IF NEW.meta_description IS DISTINCT FROM OLD.meta_description THEN v_changes := v_changes || jsonb_build_object('meta_description', NEW.meta_description); NEW.meta_description := OLD.meta_description; END IF;
      IF NEW.is_digital IS DISTINCT FROM OLD.is_digital THEN v_changes := v_changes || jsonb_build_object('is_digital', NEW.is_digital); NEW.is_digital := OLD.is_digital; END IF;

      IF v_changes <> '{}'::jsonb THEN
        NEW.pending_changes := COALESCE(OLD.pending_changes, '{}'::jsonb) || v_changes;
        NEW.pending_changes_status := 'pending';
        NEW.pending_changes_at := now();
        NEW.pending_changes_reason := NULL;
      END IF;

    ELSIF OLD.approval_status = 'rejected' AND (
         NEW.name IS DISTINCT FROM OLD.name OR NEW.slug IS DISTINCT FROM OLD.slug
      OR NEW.description IS DISTINCT FROM OLD.description OR NEW.category_id IS DISTINCT FROM OLD.category_id
      OR NEW.brand IS DISTINCT FROM OLD.brand OR NEW.barcode IS DISTINCT FROM OLD.barcode
      OR NEW.meta_title IS DISTINCT FROM OLD.meta_title OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
      OR NEW.is_digital IS DISTINCT FROM OLD.is_digital
    ) THEN
      -- Reddedilmiş (hiç yayınlanmamış) ürün düzeltildi → yeniden onaya
      NEW.approval_status := 'pending';
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.pending_changes := NULL;
    NEW.pending_changes_status := NULL;
    IF NEW.price IS NULL OR NEW.price < 0 THEN
      RAISE EXCEPTION 'Fiyat negatif olamaz' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------- Görseller: canlı üründe ekleme/silme taslağa ----------
CREATE OR REPLACE FUNCTION public.draft_product_image_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
  v_status text;
  v_add jsonb := '[]'::jsonb;
  v_remove jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF current_setting('novagross.moderation_reapprove', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT approval_status INTO v_status FROM public.products WHERE id = v_product_id;
  -- Henüz yayınlanmamış ürün (veya ürün siliniyor) → doğrudan
  IF v_status IS DISTINCT FROM 'approved' THEN RETURN COALESCE(NEW, OLD); END IF;

  -- INSERT'te OLD atanmamıştır — alan erişimi ayrı IF içinde
  IF TG_OP = 'UPDATE' THEN
    IF NEW.url IS NOT DISTINCT FROM OLD.url THEN
      RETURN NEW; -- sıra / kapak değişikliği onaysız
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_add := jsonb_build_array(jsonb_build_object('url', NEW.url, 'alt_text', NEW.alt_text));
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    v_remove := jsonb_build_array(OLD.id);
  END IF;

  PERFORM set_config('novagross.moderation_reapprove', 'on', true);
  UPDATE public.products p
     SET pending_changes = COALESCE(p.pending_changes, '{}'::jsonb)
           || jsonb_build_object(
                'images_add', COALESCE(p.pending_changes->'images_add', '[]'::jsonb) || v_add,
                'images_remove', COALESCE(p.pending_changes->'images_remove', '[]'::jsonb) || v_remove),
         pending_changes_status = 'pending',
         pending_changes_at = now(),
         pending_changes_reason = NULL
   WHERE p.id = v_product_id;
  PERFORM set_config('novagross.moderation_reapprove', 'off', true);

  RETURN NULL; -- canlı görsel tablosu değişmez
END;
$function$;

DROP TRIGGER IF EXISTS trg_reapprove_on_image_change ON public.product_images;
DROP TRIGGER IF EXISTS trg_draft_product_image_change ON public.product_images;
CREATE TRIGGER trg_draft_product_image_change BEFORE INSERT OR UPDATE OR DELETE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.draft_product_image_change();
-- Varyantlar (şu an kullanılmıyor) 20261007130000'daki reapprove trigger'ında kalır.

-- ---------- Admin: taslağı onayla / reddet ----------
CREATE OR REPLACE FUNCTION public.approve_product_changes(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  p record;
  c jsonb;
  img jsonb;
  v_next int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Yetkisiz' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF p.id IS NULL OR p.pending_changes IS NULL THEN RAISE EXCEPTION 'Onay bekleyen değişiklik yok'; END IF;
  c := p.pending_changes;

  UPDATE public.products SET
    name             = CASE WHEN c ? 'name' THEN c->>'name' ELSE name END,
    slug             = CASE WHEN c ? 'slug' THEN c->>'slug' ELSE slug END,
    description      = CASE WHEN c ? 'description' THEN c->>'description' ELSE description END,
    category_id      = CASE WHEN c ? 'category_id' THEN NULLIF(c->>'category_id', '')::uuid ELSE category_id END,
    brand            = CASE WHEN c ? 'brand' THEN c->>'brand' ELSE brand END,
    barcode          = CASE WHEN c ? 'barcode' THEN c->>'barcode' ELSE barcode END,
    meta_title       = CASE WHEN c ? 'meta_title' THEN c->>'meta_title' ELSE meta_title END,
    meta_description = CASE WHEN c ? 'meta_description' THEN c->>'meta_description' ELSE meta_description END,
    is_digital       = CASE WHEN c ? 'is_digital' THEN (c->>'is_digital')::boolean ELSE is_digital END,
    pending_changes = NULL, pending_changes_status = NULL, pending_changes_at = NULL, pending_changes_reason = NULL,
    approved_by = auth.uid(), approved_at = now(), updated_at = now()
  WHERE id = p_product_id;

  IF jsonb_typeof(c->'images_remove') = 'array' THEN
    DELETE FROM public.product_images
     WHERE product_id = p_product_id
       AND id::text IN (SELECT jsonb_array_elements_text(c->'images_remove'));
  END IF;

  IF jsonb_typeof(c->'images_add') = 'array' THEN
    SELECT COALESCE(max(sort_order), -1) + 1 INTO v_next FROM public.product_images WHERE product_id = p_product_id;
    FOR img IN SELECT * FROM jsonb_array_elements(c->'images_add') LOOP
      INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary)
      VALUES (p_product_id, img->>'url', img->>'alt_text', v_next, false);
      v_next := v_next + 1;
    END LOOP;
  END IF;

  -- Kapak görseli silindiyse ilk görseli kapak yap
  IF NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = p_product_id AND is_primary) THEN
    UPDATE public.product_images SET is_primary = true
     WHERE id = (SELECT id FROM public.product_images WHERE product_id = p_product_id ORDER BY sort_order LIMIT 1);
  END IF;

  PERFORM public.notify_store(p.store_id, 'staff', 'product_changes_approved', 'product',
    'Ürün değişikliğiniz yayında ✅', left(COALESCE(c->>'name', p.name), 80),
    jsonb_build_object('product_id', p_product_id), '/urunler');
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_product_changes(p_product_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE p record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Yetkisiz' USING ERRCODE = '42501'; END IF;
  IF COALESCE(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Red nedeni gerekli'; END IF;
  UPDATE public.products
     SET pending_changes_status = 'rejected', pending_changes_reason = left(trim(p_reason), 500)
   WHERE id = p_product_id AND pending_changes IS NOT NULL
   RETURNING id, name, store_id INTO p;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Onay bekleyen değişiklik yok'; END IF;

  PERFORM public.notify_store(p.store_id, 'staff', 'product_changes_rejected', 'product',
    'Ürün değişikliğiniz onaylanmadı', left(p.name, 60) || ' — ' || left(trim(p_reason), 80) || ' (ürün eski haliyle yayında)',
    jsonb_build_object('product_id', p_product_id), '/urunler');
END;
$function$;

-- ---------- Satıcı: taslağı iptal et ----------
CREATE OR REPLACE FUNCTION public.discard_product_changes(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND (public.is_store_member(store_id, 'staff') OR public.is_admin())) THEN
    RAISE EXCEPTION 'Yetkisiz' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('novagross.moderation_reapprove', 'on', true);
  UPDATE public.products
     SET pending_changes = NULL, pending_changes_status = NULL, pending_changes_at = NULL, pending_changes_reason = NULL
   WHERE id = p_product_id;
  PERFORM set_config('novagross.moderation_reapprove', 'off', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_product_changes(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_product_changes(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.discard_product_changes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_product_changes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_product_changes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_product_changes(uuid) TO authenticated;
