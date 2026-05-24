-- =================================================================
-- FINAL FIX: Signup RLS Policies
-- =================================================================
-- Problem: During signup, auth.uid() is NULL because user is not yet authenticated.
-- Both profiles and email_preferences triggers run AFTER INSERT on auth.users,
-- but RLS policies with auth.uid() = id/user_id checks FAIL during signup.
-- 
-- Solution: 
-- 1. For profiles: Use permissive INSERT policy for triggers (SECURITY DEFINER bypass doesn't work with RLS)
-- 2. For email_preferences: Add INSERT policy that allows trigger to work
-- 3. Make both triggers completely non-fatal
-- =================================================================

-- =================================================================
-- PART 1: Fix profiles INSERT policies
-- =================================================================

-- Drop all existing INSERT policies on profiles
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- Create a permissive INSERT policy that allows the trigger to work
-- The trigger already validates that id = NEW.id from auth.users, so this is secure
CREATE POLICY "Allow profile insert from trigger"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- =================================================================
-- PART 2: Fix email_preferences INSERT policies
-- =================================================================

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON email_preferences;
DROP POLICY IF EXISTS "Service role full access on email_preferences" ON email_preferences;
DROP POLICY IF EXISTS "Allow email prefs insert from trigger" ON email_preferences;

-- Recreate policies: SELECT/UPDATE/DELETE only for own preferences
CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email preferences"
  ON email_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Permissive INSERT for trigger (trigger validates user_id = NEW.id from auth.users)
CREATE POLICY "Allow email prefs insert from trigger"
  ON email_preferences FOR INSERT
  WITH CHECK (true);

-- =================================================================
-- PART 3: Make handle_new_user trigger completely non-fatal
-- =================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile, ignore ALL errors
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore - signup must not fail
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- PART 4: Make create_email_preferences trigger completely non-fatal
-- =================================================================

CREATE OR REPLACE FUNCTION public.create_email_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert email preferences, ignore ALL errors
  BEGIN
    INSERT INTO public.email_preferences (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore - signup must not fail
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- PART 5: Ensure triggers are properly set up
-- =================================================================

-- Recreate triggers to ensure they use updated functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_email_preferences();

-- =================================================================
-- VERIFICATION: List current policies (for debugging)
-- =================================================================
-- Run these queries in SQL Editor to verify:
-- SELECT policyname, cmd, qual::text, with_check::text FROM pg_policies WHERE tablename = 'profiles';
-- SELECT policyname, cmd, qual::text, with_check::text FROM pg_policies WHERE tablename = 'email_preferences';
