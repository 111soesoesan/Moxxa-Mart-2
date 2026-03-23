-- ============================================================
-- POS: Add source + discount columns to orders
-- Add vendor RLS policies so shop owners can select and update
-- their own orders (needed for POS payment-status management).
-- ============================================================

-- ─── 1. New columns on orders ────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'storefront'
    CHECK (source IN ('storefront', 'pos')),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS discount_note TEXT;

-- ─── 2. Vendor: select own-shop orders ───────────────────────
-- Vendors need to read all orders for their shop (POS + order mgmt).
DROP POLICY IF EXISTS "orders_select_vendor" ON public.orders;
CREATE POLICY "orders_select_vendor" ON public.orders
  FOR SELECT USING (
    auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

-- ─── 3. Vendor: update own-shop orders ───────────────────────
-- Allows vendors to update payment_status, status, notes, etc.
-- The existing "orders_update_own" only allows customers to update
-- their own order rows; vendors need a separate policy.
DROP POLICY IF EXISTS "orders_update_vendor" ON public.orders;
CREATE POLICY "orders_update_vendor" ON public.orders
  FOR UPDATE USING (
    auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

-- ─── 4. Vendor: insert POS orders ────────────────────────────
-- The existing "orders_insert_any" covers this, but be explicit.
-- (No action needed — "orders_insert_any" WITH CHECK (TRUE) already applies.)
