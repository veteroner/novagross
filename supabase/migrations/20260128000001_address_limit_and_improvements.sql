-- Address Improvements: 10 address limit per user + metadata
-- Bu migration addresses tablosuna limit kontrolü ve iyileştirmeler ekler

-- Metadata column ekle (detayları JSON'da saklamak için)
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Address limit check function
CREATE OR REPLACE FUNCTION check_address_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM addresses 
    WHERE user_id = NEW.user_id
  ) >= 10 THEN
    RAISE EXCEPTION 'Maksimum 10 adres kaydedebilirsiniz';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: yeni adres eklenirken kontrol et
DROP TRIGGER IF EXISTS address_limit_trigger ON addresses;
CREATE TRIGGER address_limit_trigger
  BEFORE INSERT ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION check_address_limit();

-- Update updated_at otomatik
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS addresses_updated_at_trigger ON addresses;
CREATE TRIGGER addresses_updated_at_trigger
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_addresses_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = true;

-- RLS policies for addresses
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON addresses;

-- Users can view their own addresses
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own addresses (limit enforced by trigger)
CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Admin read access
CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE addresses IS 'User shipping and billing addresses (max 10 per user)';
COMMENT ON COLUMN addresses.title IS 'Adres başlığı (örn: Ev, İş, Annem)';
COMMENT ON COLUMN addresses.address_type IS 'Adres tipi: shipping, billing, both';
COMMENT ON COLUMN addresses.is_default IS 'Varsayılan adres olarak işaretle';
COMMENT ON COLUMN addresses.metadata IS 'Ek bilgiler (ör: teslim notları, kat, bina)';
