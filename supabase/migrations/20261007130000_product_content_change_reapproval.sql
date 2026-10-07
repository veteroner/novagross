-- =====================================================
-- Onaylı ürünün İÇERİK değişikliği yeniden admin onayına düşer
-- =====================================================
-- Trendyol/Hepsiburada/Amazon gibi: satıcı onaylı bir ürünün adını, açıklamasını,
-- kategorisini, markasını, barkodunu, SEO metnini, görsellerini veya varyant
-- ad/seçenek/görselini değiştirirse ürün 'pending'e döner (admin "Onay
-- Bekleyenler"e düşer). Reddedilmiş ürün düzenlenirse otomatik yeniden onaya gider.
--
-- Operasyonel alanlar onaysız değişir: price, compare_at_price, cost_price, stock,
-- low_stock_threshold, sku, weight, dimensions, is_active, varyant fiyat/stok.
--
-- Not: ürün 'pending' iken mağazada görünmez (public politika approved şartı).
-- Admin ve service role (cron, sunucu) bu kuraldan muaf.
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_product_moderation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Görsel/varyant trigger'ı (aşağıda) ürünü yeniden onaya düşürürken bayrak koyar
    IF current_setting('novagross.moderation_reapprove', true) = 'on' THEN
      RETURN NEW;
    END IF;

    -- Customer/seller approval_status/approved_by/approved_at değiştiremez
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      RAISE EXCEPTION 'approval_status sadece admin tarafından değiştirilebilir' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'approved_by sadece admin tarafından set edilir' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'approved_at sadece admin tarafından set edilir' USING ERRCODE = '42501';
    END IF;
    -- store_id değiştirilemez (başka mağazaya transfer engeli)
    IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
      RAISE EXCEPTION 'Ürün başka mağazaya taşınamaz' USING ERRCODE = '42501';
    END IF;
    -- Stok değişikliğinde negatif kontrolü
    IF NEW.stock IS NOT NULL AND NEW.stock < 0 THEN
      RAISE EXCEPTION 'Stok negatif olamaz' USING ERRCODE = '22023';
    END IF;

    -- İçerik değişti → yeniden onay
    IF OLD.approval_status IN ('approved', 'rejected') AND (
         NEW.name             IS DISTINCT FROM OLD.name
      OR NEW.description      IS DISTINCT FROM OLD.description
      OR NEW.category_id      IS DISTINCT FROM OLD.category_id
      OR NEW.brand            IS DISTINCT FROM OLD.brand
      OR NEW.barcode          IS DISTINCT FROM OLD.barcode
      OR NEW.meta_title       IS DISTINCT FROM OLD.meta_title
      OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
      OR NEW.is_digital       IS DISTINCT FROM OLD.is_digital
    ) THEN
      NEW.approval_status := 'pending';
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Yeni ürün: approval_status MUTLAKA pending
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    IF NEW.price IS NULL OR NEW.price < 0 THEN
      RAISE EXCEPTION 'Fiyat negatif olamaz' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Görsel / varyant içerik değişikliği → ürünü yeniden onaya düşür
CREATE OR REPLACE FUNCTION public.reapprove_product_on_child_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- PL/pgSQL AND zincirini kısa devre etmez: tabloya özgü alanlar ayrı IF'lerde
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'product_variants' THEN
      -- Varyantta yalnızca fiyat/stok/aktiflik değiştiyse onay gerekmez
      IF NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.options IS NOT DISTINCT FROM OLD.options
         AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'product_images' THEN
      -- Görselde yalnızca sıralama/kapak değiştiyse onay gerekmez
      IF NEW.url IS NOT DISTINCT FROM OLD.url THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  PERFORM set_config('novagross.moderation_reapprove', 'on', true);
  UPDATE public.products
     SET approval_status = 'pending', approved_by = NULL, approved_at = NULL, rejection_reason = NULL
   WHERE id = v_product_id AND approval_status IN ('approved', 'rejected');
  PERFORM set_config('novagross.moderation_reapprove', 'off', true);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_reapprove_on_image_change ON public.product_images;
CREATE TRIGGER trg_reapprove_on_image_change AFTER INSERT OR UPDATE OR DELETE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.reapprove_product_on_child_change();

DROP TRIGGER IF EXISTS trg_reapprove_on_variant_change ON public.product_variants;
CREATE TRIGGER trg_reapprove_on_variant_change AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.reapprove_product_on_child_change();
