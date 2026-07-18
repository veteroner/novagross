-- ====================================================================
-- Çok Kullanıcılı Mağaza Yönetimi (Sahip / Yönetici / Personel)
--
-- Şimdiye kadar "1 kullanıcı = 1 mağaza" (stores.owner_id = auth.uid()).
-- Bir mağazaya rol bazlı birden fazla kullanıcı bağlayabilmek için
-- store_members join tablosu + rol-duyarlı erişim yardımcıları eklenir.
--
-- stores.owner_id KAYNAK-HAKİKAT olarak kalır (değişmez "Sahip") — mevcut
-- owner_id tabanlı hiçbir kontrol kırılmaz, kimse erişim kaybetmez.
-- Roller: staff < manager < owner.
-- ====================================================================

-- --------------------------------------------------------------
-- 1) store_members: mağaza-kullanıcı-rol
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','manager','staff')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);

-- Backfill: her mağazanın sahibi 'owner' üye olur (idempotent)
INSERT INTO store_members (store_id, user_id, role)
SELECT id, owner_id, 'owner' FROM stores
ON CONFLICT (store_id, user_id) DO NOTHING;

-- --------------------------------------------------------------
-- 2) store_invitations: bekleyen davetler
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager','staff')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_invitations_store ON store_invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_email ON store_invitations(lower(email));

-- --------------------------------------------------------------
-- 3) Rol yardımcıları (model: public.owns_store / is_admin)
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_role_rank(p_role text)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE p_role WHEN 'owner' THEN 3 WHEN 'manager' THEN 2 WHEN 'staff' THEN 1 ELSE 0 END; $$;

-- Kullanıcı bu mağazada en az p_min_role yetkisine sahip mi?
-- owns_store DEĞİŞTİRİLMEDİ (Sahip = owner_id kalır); bu ayrı bir helper.
CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid, p_min_role text DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = p_store_id AND s.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.store_id = p_store_id
      AND m.user_id = auth.uid()
      AND public.store_role_rank(m.role) >= public.store_role_rank(p_min_role)
  );
$$;

-- Mevcut kullanıcının mağazası + rolü (Faz 1: tek satır). En yüksek rolü döner.
CREATE OR REPLACE FUNCTION public.get_my_store()
RETURNS TABLE (store_id uuid, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT m.store_id, m.role
  FROM public.store_members m
  WHERE m.user_id = auth.uid()
  ORDER BY public.store_role_rank(m.role) DESC, m.created_at ASC
  LIMIT 1;
$$;

-- --------------------------------------------------------------
-- 4) is_seller senkronu: üyeler de satıcı sayılır (panel erişimi)
--    Mevcut stores trigger'ı sahiplik için çalışmaya devam eder;
--    bu, üyelik değişince birleşik koşulu yeniden hesaplar.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_is_seller_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  is_seller_now BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  SELECT (
    EXISTS (SELECT 1 FROM stores WHERE owner_id = p_user_id)
    OR EXISTS (SELECT 1 FROM store_members WHERE user_id = p_user_id)
  ) INTO is_seller_now;
  UPDATE profiles
     SET is_seller = is_seller_now, updated_at = NOW()
   WHERE id = p_user_id AND is_seller IS DISTINCT FROM is_seller_now;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_members_sync_is_seller_trg()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_is_seller_for_user(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_is_seller_for_user(OLD.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.recompute_is_seller_for_user(OLD.user_id);
    PERFORM public.recompute_is_seller_for_user(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_members_sync_is_seller ON public.store_members;
CREATE TRIGGER trg_store_members_sync_is_seller
AFTER INSERT OR UPDATE OF user_id OR DELETE ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.store_members_sync_is_seller_trg();

-- --------------------------------------------------------------
-- 5) store_members / store_invitations RLS
-- --------------------------------------------------------------
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- Üyeler kendi mağazalarının üye listesini görebilir
DROP POLICY IF EXISTS "Members view store roster" ON store_members;
CREATE POLICY "Members view store roster" ON store_members FOR SELECT
  USING (public.is_store_member(store_id, 'staff'));

-- Yalnızca Sahip üye ekler/çıkarır/rol değiştirir (owner_id üzerinden)
DROP POLICY IF EXISTS "Owner manages members" ON store_members;
CREATE POLICY "Owner manages members" ON store_members FOR ALL
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_members.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_members.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages members" ON store_members;
CREATE POLICY "Admin manages members" ON store_members FOR ALL
  USING (public.is_admin());

ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages invitations" ON store_invitations;
CREATE POLICY "Owner manages invitations" ON store_invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_invitations.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_invitations.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages invitations" ON store_invitations;
CREATE POLICY "Admin manages invitations" ON store_invitations FOR ALL
  USING (public.is_admin());

-- --------------------------------------------------------------
-- 6) Davet kabul RPC (SECURITY DEFINER — kullanıcı henüz üye değil,
--    token+email eşleşince kendini store_members'a ekler)
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_store_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  inv RECORD;
  my_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT email INTO my_email FROM profiles WHERE id = auth.uid();

  SELECT * INTO inv FROM store_invitations
   WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;

  IF lower(inv.email) IS DISTINCT FROM lower(my_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  INSERT INTO store_members (store_id, user_id, role, invited_by)
  VALUES (inv.store_id, auth.uid(), inv.role, inv.invited_by)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE store_invitations SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'store_id', inv.store_id, 'role', inv.role);
END;
$$;

-- Backfill sonrası mevcut sahiplerin is_seller'ı zaten doğru (stores trigger'ı);
-- yeni membership trigger'ı bundan sonrası için birleşik koşulu korur.
