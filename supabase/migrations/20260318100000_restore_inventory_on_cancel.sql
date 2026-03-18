-- ============================================================
-- Trigger: restore inventory when an order is cancelled.
-- Fires when status transitions TO 'cancelled' from a state
-- where inventory was already deducted (confirmed/processing/
-- shipped/delivered), for products with track_inventory = true.
-- ============================================================

CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
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
  v_new_stock      INTEGER;
BEGIN
  -- Only fire when status transitions TO 'cancelled'
  IF OLD.status = 'cancelled' OR NEW.status <> 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Only restore for states where inventory was already deducted
  IF OLD.status NOT IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
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

    v_new_stock := v_current_stock + v_qty;

    UPDATE public.inventory
    SET stock_quantity  = v_new_stock,
        updated_at      = NOW(),
        last_updated_at = NOW()
    WHERE id = v_inv_id;

    UPDATE public.products
    SET stock = v_new_stock
    WHERE id = v_product_id;

    INSERT INTO public.inventory_logs (
      inventory_id, change_type, quantity_change,
      previous_quantity, new_quantity, reference_id
    ) VALUES (
      v_inv_id,
      'cancel',
      v_qty,
      v_current_stock,
      v_new_stock,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_inventory_on_order_cancelled ON public.orders;
CREATE TRIGGER restore_inventory_on_order_cancelled
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_cancel();
