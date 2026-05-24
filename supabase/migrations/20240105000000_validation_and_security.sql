-- ============================================================================
-- Nova Store - Input Validation & Security
-- ============================================================================
-- Bu migration input validation, rate limiting ve business rules ekler
-- Güvenlik: XSS prevention, format validation, rate limiting
-- ============================================================================

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Email validation
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Turkish phone validation (+90 or 0, then 10 digits)
CREATE OR REPLACE FUNCTION validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~ '^(\+90|0)?[0-9]{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Turkish IBAN validation (TR + 24 digits)
CREATE OR REPLACE FUNCTION validate_iban(iban TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN iban ~ '^TR[0-9]{24}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Turkish TC Kimlik No validation
CREATE OR REPLACE FUNCTION validate_tc_kimlik(tc TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  digits INTEGER[];
  sum1 INTEGER := 0;
  sum2 INTEGER := 0;
  check1 INTEGER;
  check2 INTEGER;
  i INTEGER;
BEGIN
  -- Check length
  IF length(tc) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if all digits
  IF tc !~ '^[0-9]{11}$' THEN
    RETURN FALSE;
  END IF;
  
  -- First digit can't be 0
  IF substring(tc, 1, 1) = '0' THEN
    RETURN FALSE;
  END IF;
  
  -- Convert to array
  FOR i IN 1..11 LOOP
    digits[i] := substring(tc, i, 1)::INTEGER;
  END LOOP;
  
  -- Calculate first check digit
  FOR i IN 1..9 BY 2 LOOP
    sum1 := sum1 + digits[i];
  END LOOP;
  
  FOR i IN 2..8 BY 2 LOOP
    sum2 := sum2 + digits[i];
  END LOOP;
  
  check1 := ((sum1 * 7) - sum2) % 10;
  
  -- Check 10th digit
  IF check1 != digits[10] THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate second check digit
  sum1 := 0;
  FOR i IN 1..10 LOOP
    sum1 := sum1 + digits[i];
  END LOOP;
  
  check2 := sum1 % 10;
  
  -- Check 11th digit
  RETURN check2 = digits[11];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Price validation (0 to 1,000,000 TL)
CREATE OR REPLACE FUNCTION validate_price(price DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN price >= 0 AND price <= 1000000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Stock validation (0 to 1,000,000)
CREATE OR REPLACE FUNCTION validate_stock(stock INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stock >= 0 AND stock <= 1000000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Commission rate validation (0 to 100%)
CREATE OR REPLACE FUNCTION validate_commission_rate(rate DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN rate >= 0 AND rate <= 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Text sanitization (remove dangerous characters)
CREATE OR REPLACE FUNCTION sanitize_text(input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove < and > to prevent XSS
  -- Trim whitespace
  RETURN TRIM(
    REPLACE(
      REPLACE(input, '<', ''),
      '>', ''
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Slug normalization
CREATE OR REPLACE FUNCTION normalize_slug(input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase
  -- Replace Turkish characters
  -- Replace spaces with hyphens
  -- Remove special characters
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRANSLATE(
          input,
          'ğüşıöçĞÜŞİÖÇ ',
          'gusiocGUSIOC-'
        ),
        '[^a-z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VALIDATION TRIGGERS
-- ============================================================================

-- Validate profiles
CREATE OR REPLACE FUNCTION validate_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate email
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone
  IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Sanitize text fields
  NEW.first_name := sanitize_text(NEW.first_name);
  NEW.last_name := sanitize_text(NEW.last_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile();

-- Validate products
CREATE OR REPLACE FUNCTION validate_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate price
  IF NOT validate_price(NEW.price) THEN
    RAISE EXCEPTION 'Price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate compare price
  IF NEW.compare_at_price IS NOT NULL AND NOT validate_price(NEW.compare_at_price) THEN
    RAISE EXCEPTION 'Compare price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate cost price
  IF NEW.cost_price IS NOT NULL AND NOT validate_price(NEW.cost_price) THEN
    RAISE EXCEPTION 'Cost price must be between 0 and 1,000,000 TL';
  END IF;
  
  -- Validate stock
  IF NOT validate_stock(NEW.stock) THEN
    RAISE EXCEPTION 'Stock must be between 0 and 1,000,000';
  END IF;
  
  -- Sanitize text fields
  NEW.name := sanitize_text(NEW.name);
  NEW.description := sanitize_text(NEW.description);
  NEW.meta_title := sanitize_text(NEW.meta_title);
  NEW.meta_description := sanitize_text(NEW.meta_description);
  
  -- Normalize slug
  NEW.slug := normalize_slug(NEW.slug);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_product_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product();

-- Validate stores
CREATE OR REPLACE FUNCTION validate_store()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate email
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Validate IBAN
  IF NEW.iban IS NOT NULL AND NEW.iban != '' AND NOT validate_iban(NEW.iban) THEN
    RAISE EXCEPTION 'Invalid IBAN format. Must be TR followed by 24 digits';
  END IF;
  
  -- Validate commission rate
  IF NOT validate_commission_rate(NEW.commission_rate) THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100';
  END IF;
  
  -- Sanitize text fields
  NEW.store_name := sanitize_text(NEW.store_name);
  NEW.description := sanitize_text(NEW.description);
  NEW.company_name := sanitize_text(NEW.company_name);
  NEW.address := sanitize_text(NEW.address);
  
  -- Normalize slug
  NEW.store_slug := normalize_slug(NEW.store_slug);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_trigger
  BEFORE INSERT OR UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION validate_store();

-- Validate store applications
CREATE OR REPLACE FUNCTION validate_store_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Validate email
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Sanitize text fields
  NEW.store_name := sanitize_text(NEW.store_name);
  NEW.description := sanitize_text(NEW.description);
  NEW.company_name := sanitize_text(NEW.company_name);
  NEW.address := sanitize_text(NEW.address);
  
  -- Normalize slug
  NEW.store_slug := normalize_slug(NEW.store_slug);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_application_trigger
  BEFORE INSERT OR UPDATE ON store_applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_store_application();

-- Validate withdrawal requests
CREATE OR REPLACE FUNCTION validate_withdrawal_request()
RETURNS TRIGGER AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Only validate on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Validate IBAN
    IF NOT validate_iban(NEW.iban) THEN
      RAISE EXCEPTION 'Invalid IBAN format. Must be TR followed by 24 digits';
    END IF;
    
    -- Validate amount (minimum 500 TL, maximum 50,000 TL)
    IF NEW.amount < 500 THEN
      RAISE EXCEPTION 'Minimum withdrawal amount is 500 TL';
    END IF;
    
    IF NEW.amount > 50000 THEN
      RAISE EXCEPTION 'Maximum withdrawal amount is 50,000 TL';
    END IF;
    
    -- Check available balance
    SELECT available_balance INTO current_balance
    FROM store_balance
    WHERE store_id = NEW.store_id;
    
    IF current_balance IS NULL OR current_balance < NEW.net_amount THEN
      RAISE EXCEPTION 'Insufficient available balance. Available: % TL', COALESCE(current_balance, 0);
    END IF;
  END IF;
  
  -- Sanitize text fields
  NEW.bank_name := sanitize_text(NEW.bank_name);
  NEW.account_holder := sanitize_text(NEW.account_holder);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_withdrawal_request_trigger
  BEFORE INSERT OR UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_request();

-- Validate store reviews
CREATE OR REPLACE FUNCTION validate_store_review()
RETURNS TRIGGER AS $$
DECLARE
  store_owner_id UUID;
BEGIN
  -- Validate rating (1-5)
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Prevent self-review
  SELECT owner_id INTO store_owner_id FROM stores WHERE id = NEW.store_id;
  IF store_owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'Cannot review own store';
  END IF;
  
  -- Sanitize text fields
  NEW.title := sanitize_text(NEW.title);
  NEW.comment := sanitize_text(NEW.comment);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_review_trigger
  BEFORE INSERT OR UPDATE ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_store_review();

-- Validate product reviews
CREATE OR REPLACE FUNCTION validate_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate rating (1-5)
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Sanitize text fields
  NEW.title := sanitize_text(NEW.title);
  NEW.comment := sanitize_text(NEW.comment);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_review_trigger
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_review();

-- Validate addresses
CREATE OR REPLACE FUNCTION validate_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone
  IF NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Sanitize text fields
  NEW.title := sanitize_text(NEW.title);
  NEW.first_name := sanitize_text(NEW.first_name);
  NEW.last_name := sanitize_text(NEW.last_name);
  NEW.address_line1 := sanitize_text(NEW.address_line1);
  NEW.address_line2 := sanitize_text(NEW.address_line2);
  NEW.city := sanitize_text(NEW.city);
  NEW.district := sanitize_text(NEW.district);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_address_trigger
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION validate_address();

-- Validate contact messages
CREATE OR REPLACE FUNCTION validate_contact_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate email
  IF NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone (optional)
  IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Sanitize text fields
  NEW.name := sanitize_text(NEW.name);
  NEW.subject := sanitize_text(NEW.subject);
  NEW.message := sanitize_text(NEW.message);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_contact_message_trigger
  BEFORE INSERT OR UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_contact_message();

-- ============================================================================
-- RATE LIMITING
-- ============================================================================

-- Rate limit product creation (50 per day per store)
CREATE OR REPLACE FUNCTION check_product_creation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE store_id = NEW.store_id
  AND created_at > NOW() - INTERVAL '24 hours';
  
  IF product_count >= 50 THEN
    RAISE EXCEPTION 'Product creation rate limit exceeded. Maximum 50 products per day.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_creation_rate_limit
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_creation_rate_limit();

-- Rate limit withdrawal requests (3 per day per store)
CREATE OR REPLACE FUNCTION check_withdrawal_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM withdrawal_requests
  WHERE store_id = NEW.store_id
  AND requested_at > NOW() - INTERVAL '24 hours';
  
  IF request_count >= 3 THEN
    RAISE EXCEPTION 'Withdrawal request rate limit exceeded. Maximum 3 requests per day.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER withdrawal_rate_limit
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_withdrawal_rate_limit();

-- Rate limit contact messages (5 per hour per email)
CREATE OR REPLACE FUNCTION check_contact_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO message_count
  FROM contact_messages
  WHERE LOWER(email) = LOWER(NEW.email)
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF message_count >= 5 THEN
    RAISE EXCEPTION 'Contact message rate limit exceeded. Maximum 5 messages per hour.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_message_rate_limit
  BEFORE INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_contact_message_rate_limit();

-- ============================================================================
-- BUSINESS RULES
-- ============================================================================

-- Prevent duplicate store applications
CREATE OR REPLACE FUNCTION check_duplicate_application()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM store_applications
  WHERE user_id = NEW.user_id
  AND status IN ('pending', 'under_review');
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending store application';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_application
  BEFORE INSERT ON store_applications
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_application();

-- Prevent duplicate store reviews
CREATE OR REPLACE FUNCTION check_duplicate_store_review()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Allow one review per user per store
  IF NEW.order_id IS NULL THEN
    SELECT COUNT(*) INTO existing_count
    FROM store_reviews
    WHERE user_id = NEW.user_id
    AND store_id = NEW.store_id
    AND order_id IS NULL;
    
    IF existing_count > 0 THEN
      RAISE EXCEPTION 'You have already reviewed this store';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_store_review
  BEFORE INSERT ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_store_review();

-- Ensure only one default address per type
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default addresses of same type
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND address_type = NEW.address_type
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON FUNCTION validate_email(TEXT) IS 'Validate email format';
COMMENT ON FUNCTION validate_phone(TEXT) IS 'Validate Turkish phone format (+90 or 0, then 10 digits)';
COMMENT ON FUNCTION validate_iban(TEXT) IS 'Validate Turkish IBAN (TR + 24 digits)';
COMMENT ON FUNCTION validate_tc_kimlik(TEXT) IS 'Validate Turkish TC Kimlik No with algorithm';
COMMENT ON FUNCTION validate_price(DECIMAL) IS 'Validate price range (0 to 1,000,000 TL)';
COMMENT ON FUNCTION validate_stock(INTEGER) IS 'Validate stock range (0 to 1,000,000)';
COMMENT ON FUNCTION validate_commission_rate(DECIMAL) IS 'Validate commission rate (0 to 100%)';
COMMENT ON FUNCTION sanitize_text(TEXT) IS 'Remove dangerous characters for XSS prevention';
COMMENT ON FUNCTION normalize_slug(TEXT) IS 'Normalize slug for URLs (lowercase, hyphenated, no special chars)';
