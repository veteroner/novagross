-- Add user preferences columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalized_offers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_locale ON public.profiles(locale);
CREATE INDEX IF NOT EXISTS idx_profiles_newsletter ON public.profiles(newsletter_subscribed);

COMMENT ON COLUMN public.profiles.email_notifications IS 'User preference for email notifications';
COMMENT ON COLUMN public.profiles.sms_notifications IS 'User preference for SMS notifications';
COMMENT ON COLUMN public.profiles.push_notifications IS 'User preference for push notifications';
COMMENT ON COLUMN public.profiles.personalized_offers IS 'User preference for personalized offers';
COMMENT ON COLUMN public.profiles.locale IS 'User preferred language (ISO 639-1 code)';
COMMENT ON COLUMN public.profiles.currency IS 'User preferred currency (ISO 4217 code)';
