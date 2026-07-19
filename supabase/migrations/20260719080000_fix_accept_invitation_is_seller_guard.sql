-- accept_store_invitation: prevent_role_self_escalation trigger'ı, davet kabul
-- eden kullanıcının kendi is_seller'ını true yapmasını (store_members INSERT
-- trigger'ı → recompute_is_seller_for_user üzerinden) "self-escalation" sanıp
-- 42501 ile engelliyordu → RPC çöküyor, /davet sayfası "server_error" gösteriyordu.
--
-- Bu fonksiyon zaten güvenli: auth.uid() zorunlu, token pending+expired kontrolü,
-- ve davet e-postası ile kullanıcının e-postası eşleşmeli. Bu doğrulamalardan
-- SONRA membership INSERT'inden hemen önce JWT bağlamını transaction-local olarak
-- temizleyip guard'ın "auth.uid() IS NULL → RETURN NEW" dalına düşürüyoruz.
-- Yalnızca bu kabul transaction'ına özel; admin/mağaza-oluşturma akışları etkilenmez.
CREATE OR REPLACE FUNCTION public.accept_store_invitation(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  inv RECORD;
  my_email TEXT;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT email INTO my_email FROM profiles WHERE id = v_uid;

  SELECT * INTO inv FROM store_invitations
   WHERE token = p_token AND status = 'pending' AND expires_at > NOW();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;

  IF lower(inv.email) IS DISTINCT FROM lower(my_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  -- is_seller sync trigger'ı guard'ın auth.uid() IS NULL dalına düşsün diye
  -- JWT bağlamını bu transaction için geçici temizle (uid zaten v_uid'de saklı).
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  INSERT INTO store_members (store_id, user_id, role, invited_by)
  VALUES (inv.store_id, v_uid, inv.role, inv.invited_by)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE store_invitations SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'store_id', inv.store_id, 'role', inv.role);
END;
$$;
