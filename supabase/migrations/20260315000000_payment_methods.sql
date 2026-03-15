-- ============================================================
-- Payment Methods Management System
-- Enables vendors to create and manage payment methods
-- for their products, with support for cash and bank transfers
-- ============================================================

-- ─── CREATE PAYMENT_METHODS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('cash', 'bank')),
  name        TEXT NOT NULL,
  description TEXT,
  
  -- Bank-specific fields
  bank_name         TEXT,
  account_holder    TEXT,
  account_number    TEXT,
  proof_required    BOOLEAN NOT NULL DEFAULT FALSE,
  
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_payment_method_per_shop UNIQUE (shop_id, name)
);

-- ─── CREATE UPDATED_AT TRIGGER FOR PAYMENT_METHODS ─────────
CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── EXTEND PRODUCTS TABLE ──────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS payment_method_ids UUID[] NOT NULL DEFAULT '{}';

-- ─── EXTEND ORDERS TABLE ────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- ─── ENABLE RLS ON PAYMENT_METHODS ──────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Payment methods: shop owner can read/insert/update/delete their own
CREATE POLICY "payment_methods_select_own" ON public.payment_methods
  FOR SELECT USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_insert_own" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_update_own" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_delete_own" ON public.payment_methods
  FOR DELETE USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

-- ─── FUNCTION: AUTO-CREATE CASH ON DELIVERY FOR NEW SHOPS ────
CREATE OR REPLACE FUNCTION public.create_default_cash_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.payment_methods (shop_id, type, name, description, is_active)
  VALUES (
    NEW.id,
    'cash',
    'Cash on Delivery',
    'Payment on delivery',
    TRUE
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create default cash payment when shop is created
-- 1) Ensure pgcrypto (for gen_random_uuid) is available (optional if you already have another UUID function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.create_default_cash_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a default cash payment for the newly created shop.
  -- Adjust column names as needed to match your payments table.
  INSERT INTO public.payments (
    id,
    shop_id,
    user_id,
    amount_cents,
    currency,
    status,
    method,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),          -- id
    NEW.id,                    -- shop_id
    NEW.owner_id,              -- user_id (assumes shops.owner_id exists)
    0,                         -- amount_cents: default 0
    'MMK',                     -- currency: change if needed
    'pending',                 -- status: default pending
    'cash',                    -- method: cash default
    jsonb_build_object('note', 'Default cash payment created on shop creation'), -- metadata
    NOW()                      -- created_at
  );

  RETURN NEW;
END;
$$;

-- 3) (Re)create the trigger to call the function after insert on public.shops
DROP TRIGGER IF EXISTS create_default_cash_on_shops ON public.shops;

CREATE TRIGGER create_default_cash_on_shops
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_cash_payment();

-- ─── CREATE DEFAULT CASH PAYMENTS FOR EXISTING SHOPS ────────
-- This ensures backward compatibility for shops created before this migration
INSERT INTO public.payment_methods (shop_id, type, name, description, is_active)
SELECT id, 'cash', 'Cash on Delivery', 'Payment on delivery', TRUE
FROM public.shops
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods WHERE shop_id = shops.id
);

-- ─── BACKFILL PAYMENT_METHOD_IDS FOR EXISTING PRODUCTS ──────
-- Assign default Cash on Delivery to all products without payment methods
UPDATE public.products
SET payment_method_ids = ARRAY[
  (SELECT id FROM public.payment_methods 
   WHERE shop_id = products.shop_id AND name = 'Cash on Delivery' LIMIT 1)
]
WHERE payment_method_ids = '{}' OR payment_method_ids IS NULL;

-- ─── BACKFILL PAYMENT_METHOD_ID FOR EXISTING ORDERS ─────────
-- Assign default Cash on Delivery to all orders without payment method
UPDATE public.orders
SET payment_method_id = (
  SELECT id FROM public.payment_methods 
  WHERE shop_id = orders.shop_id AND name = 'Cash on Delivery' LIMIT 1
)
WHERE payment_method_id IS NULL;

-- ─── CREATE INDEXES FOR PERFORMANCE ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_methods_shop_id ON public.payment_methods(shop_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON public.payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id ON public.orders(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
