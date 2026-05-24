-- OTP (One-Time Password) System for 2FA
-- Store temporary OTP codes for two-factor authentication

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_code ON otp_codes(code);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on otp_codes" ON otp_codes 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Cleanup expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE otp_codes IS 'One-time password codes for 2FA with 10-minute expiry';
