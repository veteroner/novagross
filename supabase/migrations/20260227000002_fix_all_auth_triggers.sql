-- Fix ALL auth triggers to handle Google OAuth and prevent "Database error saving new user"
-- This replaces handle_new_user and create_email_preferences with error-safe versions

-- 1. Fix handle_new_user - supports Google OAuth given_name/family_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with full COALESCE for all OAuth providers
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'given_name',
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1),
        ''
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'family_name',
        CASE 
          WHEN array_length(string_to_array(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' '), 1) > 1
          THEN split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 2)
          ELSE ''
        END,
        ''
      )
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
      last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- Never block user creation due to profile insert failure
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix create_email_preferences - add error handling
CREATE OR REPLACE FUNCTION public.create_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.email_preferences (user_id, email)
    VALUES (NEW.id, COALESCE(NEW.email, ''))
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Never block user creation due to email prefs insert failure
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the email prefs trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_email_preferences();
