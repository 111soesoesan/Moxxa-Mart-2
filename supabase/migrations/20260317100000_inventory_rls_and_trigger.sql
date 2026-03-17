-- ============================================================
-- Fix: Missing RLS INSERT policies and auto-inventory trigger
-- ============================================================

-- ─── INVENTORY: allow shop owners to insert rows ────────────
CREATE POLICY inventory_insert_policy ON inventory
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- ─── CUSTOMERS: allow service role / triggers to insert ─────
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (true);

-- ─── CUSTOMER_ACTIVITY: allow insert ────────────────────────
CREATE POLICY customer_activity_insert_policy ON customer_activity
  FOR INSERT
  WITH CHECK (true);

-- ─── AUTO-CREATE INVENTORY RECORD ON PRODUCT INSERT ─────────
CREATE OR REPLACE FUNCTION public.create_inventory_on_product_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.inventory (product_id, shop_id, stock_quantity, low_stock_threshold)
  VALUES (NEW.id, NEW.shop_id, NEW.stock, 5)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_inventory ON public.products;
CREATE TRIGGER auto_create_inventory
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_product_insert();

-- ─── BACKFILL: create inventory rows for existing products ───
INSERT INTO public.inventory (product_id, shop_id, stock_quantity, low_stock_threshold)
SELECT p.id, p.shop_id, p.stock, 5
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory i WHERE i.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;
