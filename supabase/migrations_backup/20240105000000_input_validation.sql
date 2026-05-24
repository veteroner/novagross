-- Input Validation Functions
-- Server-side validation functions to ensure data integrity

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Validate email format
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate phone number (Turkish format)
CREATE OR REPLACE FUNCTION validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove spaces and dashes
  phone := regexp_replace(phone, '[ -]', '', 'g');
  -- Check if it's a valid Turkish phone number (10 or 11 digits, optionally starting with +90)
  RETURN phone ~* '^(\+90|0)?[0-9]{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate IBAN (Turkish format)
CREATE OR REPLACE FUNCTION validate_iban(iban TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove spaces
  iban := regexp_replace(iban, ' ', '', 'g');
  -- Turkish IBAN should be 26 characters starting with TR
  RETURN iban ~* '^TR[0-9]{24}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate TC Kimlik No (Turkish ID)
CREATE OR REPLACE FUNCTION validate_tc_kimlik(tc TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  total INTEGER := 0;
  odd_sum INTEGER := 0;
  even_sum INTEGER := 0;
  check_digit INTEGER;
  last_digit INTEGER;
BEGIN
  -- Must be exactly 11 digits
  IF NOT (tc ~ '^[0-9]{11}$') THEN
    RETURN FALSE;
  END IF;
  
  -- First digit cannot be 0
  IF substring(tc, 1, 1) = '0' THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate sums for validation algorithm
  FOR i IN 1..9 LOOP
    IF i % 2 = 1 THEN
      odd_sum := odd_sum + substring(tc, i, 1)::INTEGER;
    ELSE
      even_sum := even_sum + substring(tc, i, 1)::INTEGER;
    END IF;
  END LOOP;
  
  -- 10th digit check
  check_digit := ((odd_sum * 7) - even_sum) % 10;
  IF check_digit <> substring(tc, 10, 1)::INTEGER THEN
    RETURN FALSE;
  END IF;
  
  -- 11th digit check
  FOR i IN 1..10 LOOP
    total := total + substring(tc, i, 1)::INTEGER;
  END LOOP;
  
  last_digit := total % 10;
  IF last_digit <> substring(tc, 11, 1)::INTEGER THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate price (must be positive and reasonable)
CREATE OR REPLACE FUNCTION validate_price(price DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN price > 0 AND price <= 1000000; -- Max 1M TL
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate stock (must be non-negative and reasonable)
CREATE OR REPLACE FUNCTION validate_stock(stock INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stock >= 0 AND stock <= 1000000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate commission rate (0-100%)
CREATE OR REPLACE FUNCTION validate_commission_rate(rate DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN rate >= 0 AND rate <= 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sanitize text input (prevent XSS)
CREATE OR REPLACE FUNCTION sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove dangerous characters
  input_text := regexp_replace(input_text, '[<>]', '', 'g');
  
  -- Trim whitespace
  input_text := trim(input_text);
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VALIDATION TRIGGERS
-- =====================================================

-- Validate store application data
CREATE OR REPLACE FUNCTION validate_store_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Validate IBAN
  IF NEW.bank_iban IS NOT NULL AND NOT validate_iban(NEW.bank_iban) THEN
    RAISE EXCEPTION 'Invalid IBAN format';
  END IF;
  
  -- Sanitize text fields
  NEW.business_name := sanitize_text(NEW.business_name);
  NEW.business_address := sanitize_text(NEW.business_address);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_application_trigger
BEFORE INSERT OR UPDATE ON store_applications
FOR EACH ROW
EXECUTE FUNCTION validate_store_application();

-- Validate product data
CREATE OR REPLACE FUNCTION validate_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate price
  IF NOT validate_price(NEW.price) THEN
    RAISE EXCEPTION 'Invalid price: must be between 0 and 1,000,000';
  END IF;
  
  -- Validate stock
  IF NEW.stock_quantity IS NOT NULL AND NOT validate_stock(NEW.stock_quantity) THEN
    RAISE EXCEPTION 'Invalid stock quantity: must be between 0 and 1,000,000';
  END IF;
  
  -- Sanitize text fields
  NEW.name := sanitize_text(NEW.name);
  NEW.description := sanitize_text(NEW.description);
  
  -- Ensure slug is lowercase and hyphenated
  IF NEW.slug IS NOT NULL THEN
    NEW.slug := lower(regexp_replace(NEW.slug, '[^a-z0-9-]', '-', 'g'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_product_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION validate_product();

-- Validate store data
CREATE OR REPLACE FUNCTION validate_store()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Validate email
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate commission rate
  IF NEW.commission_rate IS NOT NULL AND NOT validate_commission_rate(NEW.commission_rate) THEN
    RAISE EXCEPTION 'Invalid commission rate: must be between 0 and 100';
  END IF;
  
  -- Sanitize text fields
  NEW.store_name := sanitize_text(NEW.store_name);
  NEW.description := sanitize_text(NEW.description);
  
  -- Ensure slug is lowercase and hyphenated
  IF NEW.store_slug IS NOT NULL THEN
    NEW.store_slug := lower(regexp_replace(NEW.store_slug, '[^a-z0-9-]', '-', 'g'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_trigger
BEFORE INSERT OR UPDATE ON stores
FOR EACH ROW
EXECUTE FUNCTION validate_store();

-- Validate withdrawal request
CREATE OR REPLACE FUNCTION validate_withdrawal_request()
RETURNS TRIGGER AS $$
DECLARE
  available_balance DECIMAL;
BEGIN
  -- Get current available balance
  SELECT sb.available_balance INTO available_balance
  FROM store_balance sb
  WHERE sb.store_id = NEW.store_id;
  
  -- Validate amount
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than 0';
  END IF;
  
  IF NEW.amount > available_balance THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;
  
  -- Minimum withdrawal amount (500 TL)
  IF NEW.amount < 500 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is 500 TL';
  END IF;
  
  -- Maximum withdrawal amount (50,000 TL per request)
  IF NEW.amount > 50000 THEN
    RAISE EXCEPTION 'Maximum withdrawal amount is 50,000 TL per request';
  END IF;
  
  -- Validate IBAN
  IF NEW.bank_iban IS NOT NULL AND NOT validate_iban(NEW.bank_iban) THEN
    RAISE EXCEPTION 'Invalid IBAN format';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_withdrawal_request_trigger
BEFORE INSERT ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION validate_withdrawal_request();

-- Validate store review
CREATE OR REPLACE FUNCTION validate_store_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate rating (1-5)
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Sanitize comment
  NEW.comment := sanitize_text(NEW.comment);
  
  -- Prevent self-review
  IF EXISTS (
    SELECT 1 FROM stores 
    WHERE id = NEW.store_id 
    AND owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Store owners cannot review their own stores';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_store_review_trigger
BEFORE INSERT OR UPDATE ON store_reviews
FOR EACH ROW
EXECUTE FUNCTION validate_store_review();

-- =====================================================
-- RATE LIMITING
-- =====================================================

-- Function to check rate limits (example: product creation)
CREATE OR REPLACE FUNCTION check_product_creation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INTEGER;
  store_owner_id UUID;
BEGIN
  -- Get store owner
  SELECT owner_id INTO store_owner_id
  FROM stores
  WHERE id = NEW.store_id;
  
  -- Count products created today by this store
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE store_id = NEW.store_id
  AND created_at >= CURRENT_DATE;
  
  -- Limit: 50 products per day per store
  IF product_count >= 50 THEN
    RAISE EXCEPTION 'Daily product creation limit (50) exceeded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_creation_rate_limit
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION check_product_creation_rate_limit();

-- Function to check withdrawal request rate limit
CREATE OR REPLACE FUNCTION check_withdrawal_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count withdrawal requests today by this store
  SELECT COUNT(*) INTO request_count
  FROM withdrawal_requests
  WHERE store_id = NEW.store_id
  AND requested_at >= CURRENT_DATE;
  
  -- Limit: 3 requests per day per store
  IF request_count >= 3 THEN
    RAISE EXCEPTION 'Daily withdrawal request limit (3) exceeded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER withdrawal_rate_limit
BEFORE INSERT ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION check_withdrawal_rate_limit();
