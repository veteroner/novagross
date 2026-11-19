-- Preserve existing evidence while adding transactional preferences and catalog aggregates.
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  agreement_type text NOT NULL CHECK (agreement_type IN ('uyelik_sozlesmesi','kvkk_aydinlatma','acik_riza','cerez_politikasi','gizlilik_politikasi','mesafeli_satis','on_bilgilendirme','pazaryeri_satici_sozlesmesi')),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  store_application_id uuid REFERENCES public.store_applications(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_user_agreements_user ON public.user_agreements(user_id,agreement_type,accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_agreements_order ON public.user_agreements(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_agreements_confirmation_token ON public.user_agreements((metadata->>'token_hash')) WHERE agreement_type='acik_riza' AND metadata ? 'token_hash';
CREATE INDEX IF NOT EXISTS idx_user_agreements_email ON public.user_agreements((metadata->>'email'),accepted_at DESC) WHERE agreement_type='acik_riza';
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own agreements" ON public.user_agreements;
CREATE POLICY "Users view own agreements" ON public.user_agreements FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Users insert own agreements" ON public.user_agreements;
DROP POLICY IF EXISTS "Admin manages agreements" ON public.user_agreements;
DROP POLICY IF EXISTS "Admins view agreements" ON public.user_agreements;
CREATE POLICY "Admins view agreements" ON public.user_agreements FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN ('admin','super_admin')));
GRANT SELECT ON public.user_agreements TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.user_agreements FROM anon,authenticated;
GRANT ALL ON public.user_agreements TO service_role;

-- New accounts have no implicit marketing opt-in. Historical records are preserved.
ALTER TABLE public.email_preferences ALTER COLUMN marketing SET DEFAULT false;
ALTER TABLE public.email_preferences ALTER COLUMN product_updates SET DEFAULT false;
ALTER TABLE public.email_preferences ALTER COLUMN abandoned_cart SET DEFAULT false;
ALTER TABLE public.email_preferences ALTER COLUMN wishlist_alerts SET DEFAULT false;
ALTER TABLE public.email_preferences ALTER COLUMN review_requests SET DEFAULT false;

-- One transaction serializes consent evidence, all duplicate-address preference rows and withdrawal.
CREATE OR REPLACE FUNCTION public.set_newsletter_preference(
 p_email text,p_enabled boolean,p_user_id uuid,p_source text,p_version text,p_text text,p_token_hash text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text := lower(trim(p_email));
BEGIN
 IF v_email IS NULL OR length(v_email)>254 OR v_email NOT LIKE '%@%.%' OR p_source NOT IN ('newsletter_confirmation','account_settings','membership') OR p_version IS NULL OR p_text IS NULL THEN RAISE EXCEPTION 'Invalid preference request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_email,0));
 IF p_token_hash IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_agreements WHERE agreement_type='acik_riza' AND metadata->>'token_hash'=p_token_hash) THEN RETURN false; END IF;
 INSERT INTO public.user_agreements(user_id,agreement_type,version,metadata)
 VALUES(p_user_id,'acik_riza',p_version,jsonb_strip_nulls(jsonb_build_object('email',v_email,'channel','email','scope','newsletter','source',p_source,'text',p_text,'state',CASE WHEN p_enabled THEN 'granted' ELSE 'withdrawn' END,'token_hash',p_token_hash)));
 UPDATE public.email_preferences SET newsletters=p_enabled,marketing=p_enabled,product_updates=false,abandoned_cart=false,wishlist_alerts=false,review_requests=false,unsubscribed_all=NOT p_enabled,unsubscribed_at=CASE WHEN p_enabled THEN NULL ELSE now() END,updated_at=now() WHERE lower(email)=v_email;
 IF NOT FOUND THEN
  INSERT INTO public.email_preferences(user_id,email,newsletters,marketing,product_updates,abandoned_cart,wishlist_alerts,review_requests,unsubscribed_all,unsubscribed_at,order_updates)
  VALUES(p_user_id,v_email,p_enabled,p_enabled,false,false,false,false,NOT p_enabled,CASE WHEN p_enabled THEN NULL ELSE now() END,true);
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_newsletter_preference(text,boolean,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_newsletter_preference(text,boolean,uuid,text,text,text,text) TO service_role;

-- Public merchandising exposes aggregate paid sales only, never buyer/order identifiers.
CREATE OR REPLACE FUNCTION public.public_product_popularity()
RETURNS TABLE(product_id uuid,order_count bigint,total_sold bigint,rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT oi.product_id,count(DISTINCT oi.order_id),sum(oi.quantity)::bigint,row_number() OVER(ORDER BY sum(oi.quantity) DESC,oi.product_id)
 FROM public.order_items oi JOIN public.orders o ON o.id=oi.order_id JOIN public.products p ON p.id=oi.product_id
 WHERE o.payment_status='paid' AND o.status::text NOT IN ('cancelled','refunded') AND o.created_at>now()-interval '30 days'
 AND p.is_active=true AND p.approval_status='approved' AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=p.store_id AND s.status='active')
 GROUP BY oi.product_id;
$$;
REVOKE ALL ON FUNCTION public.public_product_popularity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_product_popularity() TO anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.popular_products WITH(security_invoker=true) AS SELECT * FROM public.public_product_popularity();
GRANT SELECT ON public.popular_products TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.search_catalog_by_popularity(p_categories uuid[] DEFAULT NULL,p_brands text[] DEFAULT NULL,p_query text DEFAULT '',p_min numeric DEFAULT NULL,p_max numeric DEFAULT NULL,p_in_stock boolean DEFAULT false,p_offset integer DEFAULT 0,p_limit integer DEFAULT 12)
RETURNS TABLE(product_id uuid,total_count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT p.id,count(*) OVER()
 FROM public.products p LEFT JOIN public.public_product_popularity() popular ON popular.product_id=p.id
 WHERE p.is_active=true AND p.approval_status='approved' AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=p.store_id AND s.status='active')
 AND (p_categories IS NULL OR p.category_id=ANY(p_categories)) AND (p_brands IS NULL OR p.brand=ANY(p_brands))
 AND (coalesce(p_query,'')='' OR p.name ILIKE '%'||left(p_query,120)||'%' OR p.description ILIKE '%'||left(p_query,120)||'%' OR p.brand ILIKE '%'||left(p_query,120)||'%')
 AND (p_min IS NULL OR p.price>=p_min) AND (p_max IS NULL OR p.price<=p_max) AND (NOT p_in_stock OR p.stock>0)
 ORDER BY coalesce(popular.total_sold,0) DESC,p.created_at DESC,p.id
 LIMIT greatest(1,least(p_limit,100)) OFFSET greatest(0,p_offset);
$$;
GRANT EXECUTE ON FUNCTION public.search_catalog_by_popularity(uuid[],text[],text,numeric,numeric,boolean,integer,integer) TO anon,authenticated,service_role;

-- Moderation and purchase verification cannot be forged through direct browser writes.
CREATE OR REPLACE FUNCTION public.guard_review_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE purchase_id uuid;
BEGIN
 IF coalesce(auth.role(),'')='service_role' OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN ('admin','super_admin')) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  SELECT oi.order_id INTO purchase_id FROM public.order_items oi JOIN public.orders o ON o.id=oi.order_id WHERE oi.product_id=NEW.product_id AND o.user_id=auth.uid() AND o.payment_status='paid' AND o.status::text='delivered' LIMIT 1;
  IF purchase_id IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Bu ürüne ait teslim edilmiş alışveriş gerekli'; END IF;
  NEW.is_verified:=true; NEW.order_id:=purchase_id; NEW.is_approved:=false;
  NEW.seller_reply:=NULL; NEW.seller_reply_at:=NULL; NEW.seller_reply_approved:=false;
 ELSE
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN RAISE EXCEPTION 'Yorum kimliği değiştirilemez'; END IF;
  NEW.is_verified:=OLD.is_verified;
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.comment IS DISTINCT FROM OLD.comment OR NEW.rating IS DISTINCT FROM OLD.rating THEN NEW.is_approved:=false;
  ELSIF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN RAISE EXCEPTION 'Yorum onayı yalnızca moderasyonla değiştirilebilir'; END IF;
  IF NEW.seller_reply IS DISTINCT FROM OLD.seller_reply THEN
   IF auth.uid()=OLD.user_id THEN RAISE EXCEPTION 'Satıcı yanıtı düzenlenemez'; END IF;
   NEW.seller_reply_approved:=false;
  ELSIF NEW.seller_reply_approved IS DISTINCT FROM OLD.seller_reply_approved THEN RAISE EXCEPTION 'Yanıt onayı yalnızca moderasyonla değiştirilebilir'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_review_evidence ON public.reviews;
CREATE TRIGGER guard_review_evidence BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review_evidence();
REVOKE ALL ON FUNCTION public.guard_review_evidence() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_question_moderation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(auth.role(),'')='service_role' OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN ('admin','super_admin')) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Soru sahibi geçersiz'; END IF;
  NEW.question_status:='pending'; NEW.answer:=NULL; NEW.answer_status:='pending'; NEW.answered_by:=NULL; NEW.answered_at:=NULL;
 ELSE
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.question IS DISTINCT FROM OLD.question OR NEW.question_status IS DISTINCT FROM OLD.question_status THEN RAISE EXCEPTION 'Soru moderasyonu değiştirilemez'; END IF;
  IF NEW.answer IS DISTINCT FROM OLD.answer THEN NEW.answer_status:='pending';
  ELSIF NEW.answer_status IS DISTINCT FROM OLD.answer_status THEN RAISE EXCEPTION 'Yanıt onayı yalnızca moderasyonla değiştirilebilir'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_question_moderation ON public.product_questions;
CREATE TRIGGER guard_question_moderation BEFORE INSERT OR UPDATE ON public.product_questions FOR EACH ROW EXECUTE FUNCTION public.guard_question_moderation();
REVOKE ALL ON FUNCTION public.guard_question_moderation() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.public_review_summary(p_product_id uuid)
RETURNS TABLE(review_count bigint,average_rating numeric,star_counts jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(r.id),coalesce(round(avg(r.rating),1),0),jsonb_build_object('1',count(*)FILTER(WHERE r.rating=1),'2',count(*)FILTER(WHERE r.rating=2),'3',count(*)FILTER(WHERE r.rating=3),'4',count(*)FILTER(WHERE r.rating=4),'5',count(*)FILTER(WHERE r.rating=5))
 FROM public.reviews r JOIN public.products p ON p.id=r.product_id JOIN public.stores s ON s.id=p.store_id
 WHERE r.product_id=p_product_id AND r.is_approved=true AND p.is_active=true AND p.approval_status='approved' AND s.status='active';
$$;
REVOKE ALL ON FUNCTION public.public_review_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_review_summary(uuid) TO anon,authenticated,service_role;
