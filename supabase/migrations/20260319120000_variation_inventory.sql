-- ============================================================
-- Add variation-level inventory tracking
-- ============================================================

-- 1. Add nullable variation_id FK to inventory
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE;

-- 2. Drop old unique constraint on product_id alone
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_product_id_key;

-- 3. Partial unique indexes: one row per simple product, one row per variation
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_simple_product
  ON public.inventory(product_id) WHERE variation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_variation_unique
  ON public.inventory(variation_id) WHERE variation_id IS NOT NULL;

-- 4. Remove parent inventory rows for variable products (replaced by per-variation rows)
DELETE FROM public.inventory
WHERE variation_id IS NULL
  AND product_id IN (SELECT id FROM public.products WHERE product_type = 'variable');

-- 5. Backfill: create per-variation inventory rows for existing variations
INSERT INTO public.inventory (product_id, shop_id, stock_quantity, low_stock_threshold, variation_id)
SELECT
  pv.product_id,
  p.shop_id,
  COALESCE(pv.stock_quantity, 0),
  5,
  pv.id
FROM public.product_variations pv
JOIN public.products p ON p.id = pv.product_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory i WHERE i.variation_id = pv.id
);

-- 6. Update product-insert trigger: only create inventory for simple products
CREATE OR REPLACE FUNCTION public.create_inventory_on_product_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF COALESCE(NEW.product_type, 'simple') = 'simple' THEN
    INSERT INTO public.inventory (product_id, shop_id, stock_quantity, low_stock_threshold)
    VALUES (NEW.id, NEW.shop_id, COALESCE(NEW.stock, 0), 5)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. New trigger: auto-create inventory row when a variation is inserted
CREATE OR REPLACE FUNCTION public.create_inventory_on_variation_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.inventory (product_id, shop_id, stock_quantity, low_stock_threshold, variation_id)
  SELECT NEW.product_id, p.shop_id, COALESCE(NEW.stock_quantity, 0), 5, NEW.id
  FROM public.products p WHERE p.id = NEW.product_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_inventory_on_variation ON public.product_variations;
CREATE TRIGGER auto_create_inventory_on_variation
  AFTER INSERT ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_variation_insert();

-- 8. Sync trigger: when inventory.stock_quantity changes for a variation row,
--    keep product_variations.stock_quantity in sync
CREATE OR REPLACE FUNCTION public.sync_inventory_to_variation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.variation_id IS NOT NULL AND OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    UPDATE public.product_variations
    SET stock_quantity = NEW.stock_quantity, updated_at = NOW()
    WHERE id = NEW.variation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_to_variation_trigger ON public.inventory;
CREATE TRIGGER sync_inventory_to_variation_trigger
  AFTER UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_variation();

-- 9. Update the order-confirmation deduction trigger to target simple product rows only
--    (variable product stock deduction is handled via manual adjustments per variation)
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_qty            INTEGER;
  v_track          BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
BEGIN
  IF OLD.status = 'confirmed' OR NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

    SELECT track_inventory INTO v_track
    FROM public.products
    WHERE id = v_product_id;

    IF v_track IS NULL OR NOT v_track THEN
      CONTINUE;
    END IF;

    -- Only target simple product rows (variation_id IS NULL)
    SELECT id, stock_quantity INTO v_inv_id, v_current_stock
    FROM public.inventory
    WHERE product_id = v_product_id AND variation_id IS NULL
    FOR UPDATE;

    IF v_inv_id IS NULL THEN
      CONTINUE;
    END IF;

    v_current_stock := GREATEST(0, v_current_stock - v_qty);

    UPDATE public.inventory
    SET stock_quantity  = v_current_stock,
        updated_at      = NOW(),
        last_updated_at = NOW()
    WHERE id = v_inv_id;

    UPDATE public.products
    SET stock = v_current_stock
    WHERE id = v_product_id;

    INSERT INTO public.inventory_logs (
      inventory_id, change_type, quantity_change,
      previous_quantity, new_quantity, reference_id
    ) VALUES (
      v_inv_id, 'sale', -v_qty,
      v_current_stock + v_qty, v_current_stock, NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 10. Create index on variation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_variation_id ON public.inventory(variation_id);
