-- Inventory Management System & Customer Management System
-- Created: 2026-03-17
-- Purpose: Add inventory tracking and customer management for multi-vendor marketplace

-- ============================================================================
-- INVENTORY MANAGEMENT SYSTEM
-- ============================================================================

-- Create inventory table
-- Tracks stock levels for each product in a shop
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE,
  shop_id UUID NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  sku TEXT,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT inventory_shop_id_fkey FOREIGN KEY (shop_id)
    REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
  
  -- Constraint to prevent reserved > stock
  CONSTRAINT inventory_reserved_less_than_stock 
    CHECK (reserved_quantity <= stock_quantity)
);

-- Create indexes for inventory table
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(stock_quantity, low_stock_threshold)
  WHERE stock_quantity <= low_stock_threshold;

-- Create inventory logs table
-- Tracks all changes to inventory with audit trail
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('sale', 'manual_update', 'restock', 'cancel', 'reservation', 'return')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reference_id UUID, -- order_id for sales/returns/cancels
  notes TEXT,
  created_by UUID, -- user_id or system
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT inventory_logs_inventory_id_fkey FOREIGN KEY (inventory_id)
    REFERENCES inventory(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT inventory_logs_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for inventory logs
CREATE INDEX IF NOT EXISTS idx_inventory_logs_inventory_id ON inventory_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reference_id ON inventory_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type ON inventory_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- ============================================================================
-- CUSTOMER MANAGEMENT SYSTEM
-- ============================================================================

-- Create customers table
-- Tracks customer information per shop
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID, -- Link to registered user if applicable
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  last_order_at TIMESTAMP WITH TIME ZONE,
  first_order_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT customers_shop_id_fkey FOREIGN KEY (shop_id)
    REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  -- Ensure shop + email is unique (one customer per email per shop)
  CONSTRAINT customers_shop_email_unique UNIQUE (shop_id, email)
);

-- Create indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_at ON customers(last_order_at DESC);

-- Create customer activity table
-- Tracks all interactions and activities with customers
CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('order', 'message', 'visit', 'review', 'note', 'tag')),
  reference_id UUID, -- order_id, message_id, etc
  description TEXT,
  metadata JSONB, -- Additional data for extensibility
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT customer_activity_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for customer activity
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer_id ON customer_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_created_at ON customer_activity(created_at DESC);

-- ============================================================================
-- INTEGRATION ENHANCEMENTS
-- ============================================================================

-- Add customer_id to orders table to link customers to orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for orders.customer_id
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- ============================================================================
-- FUNCTIONS FOR INVENTORY MANAGEMENT
-- ============================================================================

-- Function to update inventory on order
-- Automatically deducts stock when order is placed
CREATE OR REPLACE FUNCTION update_inventory_on_order(
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Check if enough stock available
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
  END IF;
  
  -- Update inventory
  UPDATE inventory
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = NOW(),
      last_updated_at = NOW()
  WHERE id = p_inventory_id;
  
  -- Log the change
  INSERT INTO inventory_logs (
    inventory_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_id,
    created_by
  ) VALUES (
    p_inventory_id,
    'sale',
    -p_quantity,
    v_current_stock,
    v_current_stock - p_quantity,
    p_order_id,
    p_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore inventory on order cancellation
CREATE OR REPLACE FUNCTION restore_inventory_on_cancel(
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Update inventory
  UPDATE inventory
  SET stock_quantity = stock_quantity + p_quantity,
      updated_at = NOW(),
      last_updated_at = NOW()
  WHERE id = p_inventory_id;
  
  -- Log the change
  INSERT INTO inventory_logs (
    inventory_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_id,
    created_by
  ) VALUES (
    p_inventory_id,
    'cancel',
    p_quantity,
    v_current_stock,
    v_current_stock + p_quantity,
    p_order_id,
    p_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to manually update inventory
CREATE OR REPLACE FUNCTION manual_inventory_update(
  p_inventory_id UUID,
  p_new_quantity INTEGER,
  p_change_type VARCHAR,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM inventory
  WHERE id = p_inventory_id
  FOR UPDATE;
  
  -- Validate quantity
  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;
  
  -- Update inventory
  UPDATE inventory
  SET stock_quantity = p_new_quantity,
      updated_at = NOW(),
      last_updated_at = NOW()
  WHERE id = p_inventory_id;
  
  -- Log the change
  INSERT INTO inventory_logs (
    inventory_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    notes,
    created_by
  ) VALUES (
    p_inventory_id,
    CASE 
      WHEN p_new_quantity > v_current_stock THEN 'restock'
      ELSE 'manual_update'
    END,
    p_new_quantity - v_current_stock,
    v_current_stock,
    p_new_quantity,
    p_notes,
    p_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTIONS FOR CUSTOMER MANAGEMENT
-- ============================================================================

-- Function to update customer stats after order
CREATE OR REPLACE FUNCTION update_customer_stats_on_order(
  p_customer_id UUID,
  p_order_total DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE customers
  SET total_orders = total_orders + 1,
      total_spent = total_spent + p_order_total,
      last_order_at = NOW(),
      first_order_at = COALESCE(first_order_at, NOW()),
      updated_at = NOW()
  WHERE id = p_customer_id;
  
  -- Log activity
  INSERT INTO customer_activity (
    customer_id,
    activity_type,
    description
  ) VALUES (
    p_customer_id,
    'order',
    'Order placed for ' || p_order_total || ' currency units'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update inventory last_updated_at when stock changes
CREATE OR REPLACE FUNCTION trigger_inventory_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_update_timestamp
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inventory_update_timestamp();

-- Trigger to update customers updated_at
CREATE OR REPLACE FUNCTION trigger_customer_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_update_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_customer_update_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on inventory table
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Allow shop owners to view their inventory
CREATE POLICY inventory_select_policy ON inventory
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Allow shop owners to update their inventory
CREATE POLICY inventory_update_policy ON inventory
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Enable RLS on inventory_logs table
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Allow shop owners to view their inventory logs
CREATE POLICY inventory_logs_select_policy ON inventory_logs
  FOR SELECT
  USING (
    inventory_id IN (
      SELECT id FROM inventory 
      WHERE shop_id IN (
        SELECT id FROM shops WHERE owner_id = auth.uid()
      )
    )
  );

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow shop owners to view their customers
CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Allow shop owners to update their customers
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Enable RLS on customer_activity table
ALTER TABLE customer_activity ENABLE ROW LEVEL SECURITY;

-- Allow shop owners to view customer activity
CREATE POLICY customer_activity_select_policy ON customer_activity
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE shop_id IN (
        SELECT id FROM shops WHERE owner_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE inventory IS 'Tracks stock levels and availability for each product in a shop';
COMMENT ON COLUMN inventory.reserved_quantity IS 'Quantity reserved during checkout before payment confirmation';
COMMENT ON COLUMN inventory.low_stock_threshold IS 'Alert threshold for low stock warnings';
COMMENT ON COLUMN inventory.sku IS 'Stock Keeping Unit identifier for inventory tracking';

COMMENT ON TABLE inventory_logs IS 'Audit trail for all inventory changes with detailed history';
COMMENT ON COLUMN inventory_logs.change_type IS 'Type of change: sale, manual_update, restock, cancel, reservation, or return';
COMMENT ON COLUMN inventory_logs.reference_id IS 'Reference to related order or transaction ID';

COMMENT ON TABLE customers IS 'Customer records per shop for relationship management and analytics';
COMMENT ON COLUMN customers.total_spent IS 'Cumulative spending by customer for lifetime value tracking';
COMMENT ON COLUMN customers.first_order_at IS 'Timestamp of first order for customer lifecycle analysis';

COMMENT ON TABLE customer_activity IS 'Activity log for customer interactions and engagements';
COMMENT ON COLUMN customer_activity.metadata IS 'JSONB field for extensible activity data (future: tagging, segmentation)';
