-- Stock Management System - Auto decrease stock on paid orders
-- Created: 28 Ocak 2026

-- ============================================================================
-- STOCK DECREASE TRIGGER FUNCTION
-- ============================================================================
-- This function automatically decreases product stock when an order is paid
-- Prevents negative stock and logs warnings

CREATE OR REPLACE FUNCTION decrease_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
  order_payment_status TEXT;
BEGIN
  -- Check if order is paid
  SELECT payment_status INTO order_payment_status
  FROM orders
  WHERE id = NEW.order_id;

  IF order_payment_status = 'paid' THEN
    -- Get current stock
    SELECT stock INTO current_stock
    FROM products
    WHERE id = NEW.product_id;

    -- Decrease stock (prevent negative)
    UPDATE products
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.product_id;

    -- Log warning if stock goes negative
    IF current_stock < NEW.quantity THEN
      RAISE WARNING 'Product % stock insufficient. Ordered: %, Available: %', 
        NEW.product_id, NEW.quantity, current_stock;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER ON ORDER_ITEMS INSERT
-- ============================================================================
-- Auto-decrease stock when order item is inserted and order is paid

DROP TRIGGER IF EXISTS trigger_decrease_stock_on_order ON order_items;

CREATE TRIGGER trigger_decrease_stock_on_order
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION decrease_product_stock();

-- ============================================================================
-- TRIGGER ON ORDERS UPDATE (payment_status change)
-- ============================================================================
-- If order payment_status changes to 'paid', decrease stock for all items

CREATE OR REPLACE FUNCTION decrease_stock_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only when payment_status changes from not-paid to paid
  IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
    UPDATE products p
    SET stock = GREATEST(0, p.stock - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
      
    RAISE NOTICE 'Stock decreased for order %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrease_stock_on_payment ON orders;

CREATE TRIGGER trigger_decrease_stock_on_payment
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION decrease_stock_on_payment();

-- ============================================================================
-- STOCK INCREASE ON ORDER CANCELLATION
-- ============================================================================
-- Return stock when order is cancelled

CREATE OR REPLACE FUNCTION increase_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only when status changes to 'cancelled' and payment was 'paid'
  IF OLD.status != 'cancelled' 
     AND NEW.status = 'cancelled' 
     AND NEW.payment_status = 'paid' THEN
    
    UPDATE products p
    SET stock = p.stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
      
    RAISE NOTICE 'Stock returned for cancelled order %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increase_stock_on_cancel ON orders;

CREATE TRIGGER trigger_increase_stock_on_cancel
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION increase_stock_on_cancel();

-- ============================================================================
-- HELPER: Manual stock adjustment with audit
-- ============================================================================
-- Function to manually adjust stock with reason logging

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  adjustment INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at DESC);

CREATE OR REPLACE FUNCTION adjust_product_stock(
  p_product_id UUID,
  p_adjustment INTEGER,
  p_reason TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- Get current stock with row lock
  SELECT stock INTO v_old_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_old_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Calculate new stock
  v_new_stock := GREATEST(0, v_old_stock + p_adjustment);

  -- Update product stock
  UPDATE products
  SET stock = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- Log adjustment
  INSERT INTO stock_adjustments (
    product_id,
    old_stock,
    new_stock,
    adjustment,
    reason,
    adjusted_by
  ) VALUES (
    p_product_id,
    v_old_stock,
    v_new_stock,
    p_adjustment,
    p_reason,
    p_user_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION adjust_product_stock IS 'Manually adjust product stock with audit trail. Use negative numbers to decrease stock.';
COMMENT ON TABLE stock_adjustments IS 'Audit log for manual stock adjustments';
