-- Deduction and restore on order status changes: support items_snapshot.variation_id
-- for variable products (inventory row keyed by variation_id). Simple products unchanged.

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_variation_id   UUID;
  v_vid_text       TEXT;
  v_qty            INTEGER;
  v_track          BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
BEGIN
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

    v_variation_id := NULL;
    v_vid_text := NULLIF(trim(COALESCE(item->>'variation_id', '')), '');
    IF v_vid_text IS NOT NULL THEN
      BEGIN
        v_variation_id := v_vid_text::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        v_variation_id := NULL;
      END;
    END IF;

    IF v_variation_id IS NOT NULL THEN
      SELECT id, stock_quantity INTO v_inv_id, v_current_stock
      FROM public.inventory
      WHERE variation_id = v_variation_id AND product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NULL THEN CONTINUE; END IF;

      v_current_stock := GREATEST(0, v_current_stock - v_qty);

      UPDATE public.inventory
      SET stock_quantity = v_current_stock, updated_at = NOW(), last_updated_at = NOW()
      WHERE id = v_inv_id;

      INSERT INTO public.inventory_logs (
        inventory_id, change_type, quantity_change,
        previous_quantity, new_quantity, reference_id
      ) VALUES (
        v_inv_id, 'sale', -v_qty,
        v_current_stock + v_qty, v_current_stock, NEW.id
      );
    ELSE
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
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_variation_id   UUID;
  v_vid_text       TEXT;
  v_qty            INTEGER;
  v_track          BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
  v_new_stock      INTEGER;
BEGIN
  IF OLD.status NOT IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

    SELECT track_inventory INTO v_track FROM public.products WHERE id = v_product_id;
    IF v_track IS NULL OR NOT v_track THEN CONTINUE; END IF;

    v_variation_id := NULL;
    v_vid_text := NULLIF(trim(COALESCE(item->>'variation_id', '')), '');
    IF v_vid_text IS NOT NULL THEN
      BEGIN
        v_variation_id := v_vid_text::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        v_variation_id := NULL;
      END;
    END IF;

    IF v_variation_id IS NOT NULL THEN
      SELECT id, stock_quantity INTO v_inv_id, v_current_stock
      FROM public.inventory
      WHERE variation_id = v_variation_id AND product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NULL THEN CONTINUE; END IF;

      v_new_stock := v_current_stock + v_qty;

      UPDATE public.inventory
      SET stock_quantity = v_new_stock, updated_at = NOW(), last_updated_at = NOW()
      WHERE id = v_inv_id;

      INSERT INTO public.inventory_logs (
        inventory_id, change_type, quantity_change,
        previous_quantity, new_quantity, reference_id
      ) VALUES (
        v_inv_id, 'cancel', v_qty,
        v_current_stock, v_new_stock, NEW.id
      );
    ELSE
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
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
