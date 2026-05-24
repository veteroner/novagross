-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Date: 2026-02-24
-- Fixes: Role escalation, open RLS policies, missing RLS,
--        SECURITY DEFINER search_path, OTP brute-force
-- =====================================================

-- =====================================================
-- 1. FIX ROLE ESCALATION: Prevent users from changing their own role
-- =====================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_seller = (SELECT p.is_seller FROM public.profiles p WHERE p.id = auth.uid())
  );

-- =====================================================
-- 2. FIX PROFILE INSERT: Only allow inserting own profile (not arbitrary roles)
-- =====================================================
DROP POLICY IF EXISTS "Allow profile insert from trigger" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Users can only insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND (role IS NULL OR role = 'user')
  );

-- =====================================================
-- 3. FIX payments TABLE: Remove wide-open policy
-- =====================================================
DROP POLICY IF EXISTS "Backend can manage payments" ON public.payments;
-- Only allow users to read their own payments via their orders
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id AND o.user_id = auth.uid()
    )
    OR public.is_admin()
  );
-- Only admins and service_role can insert/update/delete payments
CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 4. FIX email_queue TABLE: Remove wide-open policy
-- =====================================================
DROP POLICY IF EXISTS "Backend access to email_queue" ON public.email_queue;
-- No direct access needed — service_role bypasses RLS automatically
-- Only admins can read the queue for monitoring
CREATE POLICY "Admins can view email queue"
  ON public.email_queue FOR SELECT
  USING (public.is_admin());

-- =====================================================
-- 5. ENABLE RLS ON TABLES THAT WERE MISSING IT
-- =====================================================

-- email_unsubscribes: Contains PII (email, IP, user_agent)
ALTER TABLE IF EXISTS public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Users can manage own unsubscribes"
  ON public.email_unsubscribes FOR ALL
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- stock_adjustments: Audit log — admin only
ALTER TABLE IF EXISTS public.stock_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Admins can manage stock adjustments"
  ON public.stock_adjustments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- weekly_payout_runs: Financial data — admin only
ALTER TABLE IF EXISTS public.weekly_payout_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payout runs" ON public.weekly_payout_runs;
CREATE POLICY "Admins can manage payout runs"
  ON public.weekly_payout_runs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- weekly_payout_admin_notifications: Admin only
ALTER TABLE IF EXISTS public.weekly_payout_admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payout notifications" ON public.weekly_payout_admin_notifications;
CREATE POLICY "Admins can manage payout notifications"
  ON public.weekly_payout_admin_notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 6. FIX shipping_status_history: Restrict INSERT
-- =====================================================
DROP POLICY IF EXISTS "System can insert shipping history" ON public.shipping_status_history;
CREATE POLICY "Admins can insert shipping history"
  ON public.shipping_status_history FOR INSERT
  WITH CHECK (public.is_admin());

-- =====================================================
-- 7. FIX page_views: Restrict to prevent abuse / DoS
-- =====================================================
DROP POLICY IF EXISTS "Users can insert page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert page views"
  ON public.page_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 8. FIX email_preferences INSERT
-- =====================================================
DROP POLICY IF EXISTS "Allow email prefs insert from trigger" ON public.email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 9. FIX SECURITY DEFINER FUNCTIONS: Add search_path
-- =====================================================

-- Fix create_email_preferences
CREATE OR REPLACE FUNCTION public.create_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix create_password_reset_token
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing tokens for this user
  DELETE FROM public.password_reset_tokens WHERE user_id = p_user_id;
  -- Insert new token
  INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, p_expires_at);
END;
$$;

-- Fix create_email_verification_token
CREATE OR REPLACE FUNCTION public.create_email_verification_token(
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verification_tokens WHERE user_id = p_user_id;
  INSERT INTO public.email_verification_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, p_expires_at);
END;
$$;

-- Fix verify_otp
CREATE OR REPLACE FUNCTION public.verify_otp(
  p_user_id UUID,
  p_code TEXT,
  p_purpose TEXT DEFAULT 'login'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_id UUID;
BEGIN
  SELECT id INTO v_otp_id
  FROM public.otp_codes
  WHERE user_id = p_user_id
    AND code = p_code
    AND purpose = p_purpose
    AND verified_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.otp_codes
  SET verified_at = NOW()
  WHERE id = v_otp_id;

  RETURN TRUE;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 10. OTP BRUTE-FORCE PROTECTION: Add attempt tracking
-- =====================================================
-- Add attempt_count column to otp_codes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'otp_codes' 
    AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE public.otp_codes ADD COLUMN attempt_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to verify OTP with brute-force protection (max 5 attempts)
CREATE OR REPLACE FUNCTION public.verify_otp_safe(
  p_user_id UUID,
  p_code TEXT,
  p_purpose TEXT DEFAULT 'login'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp RECORD;
  v_max_attempts INTEGER := 5;
BEGIN
  -- Get the latest valid OTP for this user/purpose
  SELECT * INTO v_otp
  FROM public.otp_codes
  WHERE user_id = p_user_id
    AND purpose = p_purpose
    AND verified_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_valid_otp');
  END IF;

  -- Check attempt count
  IF v_otp.attempt_count >= v_max_attempts THEN
    -- Invalidate the OTP
    UPDATE public.otp_codes SET verified_at = NOW() WHERE id = v_otp.id;
    RETURN jsonb_build_object('success', false, 'error', 'max_attempts_exceeded');
  END IF;

  -- Increment attempt count
  UPDATE public.otp_codes SET attempt_count = attempt_count + 1 WHERE id = v_otp.id;

  -- Check code
  IF v_otp.code != p_code THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'invalid_code',
      'remaining_attempts', v_max_attempts - v_otp.attempt_count - 1
    );
  END IF;

  -- Success — mark as verified
  UPDATE public.otp_codes SET verified_at = NOW() WHERE id = v_otp.id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 11. FIX products SELECT policy: Don't let authenticated users see inactive products
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (
    (is_active = true AND approval_status = 'approved')
    OR public.is_admin()
    OR (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  );

-- =====================================================
-- 12. Revoke direct EXECUTE on handle_new_user from authenticated
-- (should only be called by trigger, not directly)
-- =====================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- =====================================================
-- 13. Add increment_coupon_usage function if not exists
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE code = coupon_code;
END;
$$;
