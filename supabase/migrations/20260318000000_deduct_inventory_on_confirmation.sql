-- ============================================================
-- Trigger: deduct inventory when an order status transitions
-- to 'confirmed' and the product has track_inventory = true.
-- ============================================================

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
  -- Only fire when status transitions TO 'confirmed'
  IF OLD.status = 'confirmed' OR NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

    -- Skip if product has inventory tracking disabled
    SELECT track_inventory INTO v_track
    FROM public.products
    WHERE id = v_product_id;

    IF v_track IS NULL OR NOT v_track THEN
      CONTINUE;
    END IF;

    -- Lock inventory row for update
    SELECT id, stock_quantity INTO v_inv_id, v_current_stock
    FROM public.inventory
    WHERE product_id = v_product_id
    FOR UPDATE;

    IF v_inv_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Deduct, clamp at zero
    v_current_stock := GREATEST(0, v_current_stock - v_qty);

    UPDATE public.inventory
    SET stock_quantity = v_current_stock,
        updated_at     = NOW(),
        last_updated_at = NOW()
    WHERE id = v_inv_id;

    UPDATE public.products
    SET stock = v_current_stock
    WHERE id = v_product_id;

    INSERT INTO public.inventory_logs (
      inventory_id, change_type, quantity_change,
      previous_quantity, new_quantity, reference_id
    ) VALUES (
      v_inv_id,
      'sale',
      -v_qty,
      v_current_stock + v_qty,
      v_current_stock,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deduct_inventory_on_order_confirmed ON public.orders;
CREATE TRIGGER deduct_inventory_on_order_confirmed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_confirmation();
