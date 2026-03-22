-- ============================================================
-- Migration: Refactor Inventory Triggers
-- Description: Updates guard clauses to restore inventory when 
-- transitioning from any active state to any inactive state, 
-- and deduct when transitioning from inactive to active.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_qty            INTEGER;
  v_track          BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
BEGIN
  -- Guard: Only deduct if entering an active/deducted state from an inactive state
  IF OLD.status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

    SELECT track_inventory INTO v_track FROM public.products WHERE id = v_product_id;
    IF v_track IS NULL OR NOT v_track THEN CONTINUE; END IF;

    -- Target simple product rows only (variation_id IS NULL)
    SELECT id, stock_quantity INTO v_inv_id, v_current_stock
    FROM public.inventory
    WHERE product_id = v_product_id AND variation_id IS NULL
    FOR UPDATE;

    IF v_inv_id IS NULL THEN CONTINUE; END IF;

    v_current_stock := GREATEST(0, v_current_stock - v_qty);

    UPDATE public.inventory
    SET stock_quantity = v_current_stock, updated_at = NOW(), last_updated_at = NOW()
    WHERE id = v_inv_id;

    UPDATE public.products SET stock = v_current_stock WHERE id = v_product_id;

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


CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_qty            INTEGER;
  v_track          BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
  v_new_stock      INTEGER;
BEGIN
  -- Guard: Only restore if escaping an active/deducted state
  IF OLD.status NOT IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Guard: And entering an inactive/non-deducted state
  IF NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

    SELECT track_inventory INTO v_track FROM public.products WHERE id = v_product_id;
    IF v_track IS NULL OR NOT v_track THEN CONTINUE; END IF;

    SELECT id, stock_quantity INTO v_inv_id, v_current_stock
    FROM public.inventory
    WHERE product_id = v_product_id AND variation_id IS NULL
    FOR UPDATE;

    IF v_inv_id IS NULL THEN CONTINUE; END IF;

    v_new_stock := v_current_stock + v_qty;

    UPDATE public.inventory
    SET stock_quantity = v_new_stock, updated_at = NOW(), last_updated_at = NOW()
    WHERE id = v_inv_id;

    UPDATE public.products SET stock = v_new_stock WHERE id = v_product_id;

    INSERT INTO public.inventory_logs (
      inventory_id, change_type, quantity_change,
      previous_quantity, new_quantity, reference_id
    ) VALUES (
      v_inv_id, 'cancel', v_qty,
      v_current_stock, v_new_stock, NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;
