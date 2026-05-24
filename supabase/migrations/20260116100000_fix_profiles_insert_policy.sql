-- Add missing INSERT policy for profiles table
-- This allows the handle_new_user trigger to create profiles

CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also add policy for service role (used by trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
