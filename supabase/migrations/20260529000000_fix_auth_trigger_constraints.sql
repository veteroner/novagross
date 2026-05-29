-- =====================================================
-- Fix auth trigger constraint violations (post-deploy hotfix)
-- =====================================================
-- Two bugs in earlier migrations that prevented user signup:
--
-- 1. handle_new_user inserted role='user' but profiles_role_check
--    constraint only allows ('customer','admin','super_admin').
--    → Use 'customer' instead.
--
-- 2. email_preferences.email is NOT NULL but the trigger only
--    inserted user_id, causing a constraint violation.
--    → Pass NEW.email through.
--
-- Also wraps body in EXCEPTION handler so a failure here doesn't
-- roll back the auth.users insert (user can still log in even if
-- the side-effect rows fail to materialize).
-- =====================================================

-- handle_new_user: triggered after auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.email_preferences (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- create_email_preferences: alternative trigger used in some flows
CREATE OR REPLACE FUNCTION public.create_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Tighten INSERT policy to only allow role IS NULL or role='customer'
-- (matches what the trigger inserts; admins are promoted via UPDATE
-- using service_role).
DROP POLICY IF EXISTS "Users can only insert own profile" ON public.profiles;
CREATE POLICY "Users can only insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND (role IS NULL OR role = 'customer')
  );
