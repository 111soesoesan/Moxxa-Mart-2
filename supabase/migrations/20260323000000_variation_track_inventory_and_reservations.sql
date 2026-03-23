-- Per-variation inventory tracking + atomic reservation helpers + trigger updates
-- for pending-order reservations and confirmation/cancel flows.

ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.product_variations.track_inventory IS
  'When false, this SKU is treated as unlimited (no stock/reservation enforcement).';


-- Atomically reserve qty if (stock_quantity - reserved_quantity) >= qty. Returns true on success.
CREATE OR REPLACE FUNCTION public.try_reserve_inventory_line(
  p_product_id UUID,
  p_variation_id UUID,
  p_qty INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv_id   UUID;
  v_stock    INTEGER;
  v_res      INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN TRUE;
  END IF;

  IF p_variation_id IS NOT NULL THEN
    SELECT id, stock_quantity, reserved_quantity
    INTO v_inv_id, v_stock, v_res
    FROM public.inventory
    WHERE variation_id = p_variation_id AND product_id = p_product_id
    FOR UPDATE;
  ELSE
    SELECT id, stock_quantity, reserved_quantity
    INTO v_inv_id, v_stock, v_res
    FROM public.inventory
    WHERE product_id = p_product_id AND variation_id IS NULL
    FOR UPDATE;
  END IF;

  IF v_inv_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (v_stock - v_res) < p_qty THEN
    RETURN FALSE;
  END IF;

  UPDATE public.inventory
  SET
    reserved_quantity = v_res + p_qty,
    updated_at = NOW(),
    last_updated_at = NOW()
  WHERE id = v_inv_id;

  RETURN TRUE;
END;
$$;


-- Release reservation (pending order removed/cancelled). Does not change stock_quantity.
CREATE OR REPLACE FUNCTION public.release_inventory_reservation_line(
  p_product_id UUID,
  p_variation_id UUID,
  p_qty INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv_id UUID;
  v_res    INTEGER;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN;
  END IF;

  IF p_variation_id IS NOT NULL THEN
    SELECT id, reserved_quantity INTO v_inv_id, v_res
    FROM public.inventory
    WHERE variation_id = p_variation_id AND product_id = p_product_id
    FOR UPDATE;
  ELSE
    SELECT id, reserved_quantity INTO v_inv_id, v_res
    FROM public.inventory
    WHERE product_id = p_product_id AND variation_id IS NULL
    FOR UPDATE;
  END IF;

  IF v_inv_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.inventory
  SET
    reserved_quantity = GREATEST(0, v_res - p_qty),
    updated_at = NOW(),
    last_updated_at = NOW()
  WHERE id = v_inv_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.deduct_inventory_on_confirmation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item             JSONB;
  v_product_id     UUID;
  v_variation_id   UUID;
  v_vid_text       TEXT;
  v_qty            INTEGER;
  v_track_product  BOOLEAN;
  v_track_var      BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
  v_current_res    INTEGER;
  v_new_stock      INTEGER;
  v_new_res        INTEGER;
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

    SELECT track_inventory INTO v_track_product FROM public.products WHERE id = v_product_id;
    IF v_track_product IS NULL OR NOT v_track_product THEN
      CONTINUE;
    END IF;

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
      SELECT COALESCE(track_inventory, TRUE) INTO v_track_var
      FROM public.product_variations WHERE id = v_variation_id AND product_id = v_product_id;
      IF v_track_var IS NULL OR NOT v_track_var THEN
        CONTINUE;
      END IF;

      SELECT id, stock_quantity, reserved_quantity INTO v_inv_id, v_current_stock, v_current_res
      FROM public.inventory
      WHERE variation_id = v_variation_id AND product_id = v_product_id
      FOR UPDATE;

      IF v_inv_id IS NULL THEN CONTINUE; END IF;

      v_new_stock := GREATEST(0, v_current_stock - v_qty);
      v_new_res := GREATEST(0, v_current_res - v_qty);

      UPDATE public.inventory
      SET
        stock_quantity = v_new_stock,
        reserved_quantity = v_new_res,
        updated_at = NOW(),
        last_updated_at = NOW()
      WHERE id = v_inv_id;

      INSERT INTO public.inventory_logs (
        inventory_id, change_type, quantity_change,
        previous_quantity, new_quantity, reference_id
      ) VALUES (
        v_inv_id, 'sale', -v_qty,
        v_current_stock, v_new_stock, NEW.id
      );
    ELSE
      SELECT id, stock_quantity, reserved_quantity INTO v_inv_id, v_current_stock, v_current_res
      FROM public.inventory
      WHERE product_id = v_product_id AND variation_id IS NULL
      FOR UPDATE;

      IF v_inv_id IS NULL THEN CONTINUE; END IF;

      v_new_stock := GREATEST(0, v_current_stock - v_qty);
      v_new_res := GREATEST(0, v_current_res - v_qty);

      UPDATE public.inventory
      SET
        stock_quantity = v_new_stock,
        reserved_quantity = v_new_res,
        updated_at = NOW(),
        last_updated_at = NOW()
      WHERE id = v_inv_id;

      UPDATE public.products SET stock = v_new_stock WHERE id = v_product_id;

      INSERT INTO public.inventory_logs (
        inventory_id, change_type, quantity_change,
        previous_quantity, new_quantity, reference_id
      ) VALUES (
        v_inv_id, 'sale', -v_qty,
        v_current_stock, v_new_stock, NEW.id
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
  v_track_product  BOOLEAN;
  v_track_var      BOOLEAN;
  v_inv_id         UUID;
  v_current_stock  INTEGER;
  v_new_stock      INTEGER;
  v_current_res    INTEGER;
BEGIN
  -- Pending order cancelled/refunded: release reservations only (no stock movement)
  IF OLD.status = 'pending' AND NEW.status IN ('cancelled', 'refunded') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items_snapshot)
    LOOP
      v_product_id := (item->>'product_id')::UUID;
      v_qty        := COALESCE((item->>'quantity')::INTEGER, 1);

      SELECT track_inventory INTO v_track_product FROM public.products WHERE id = v_product_id;
      IF v_track_product IS NULL OR NOT v_track_product THEN
        CONTINUE;
      END IF;

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
        SELECT COALESCE(track_inventory, TRUE) INTO v_track_var
        FROM public.product_variations WHERE id = v_variation_id AND product_id = v_product_id;
        IF v_track_var IS NULL OR NOT v_track_var THEN
          CONTINUE;
        END IF;
        PERFORM public.release_inventory_reservation_line(v_product_id, v_variation_id, v_qty);
      ELSE
        PERFORM public.release_inventory_reservation_line(v_product_id, NULL, v_qty);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

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

    SELECT track_inventory INTO v_track_product FROM public.products WHERE id = v_product_id;
    IF v_track_product IS NULL OR NOT v_track_product THEN
      CONTINUE;
    END IF;

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
      SELECT COALESCE(track_inventory, TRUE) INTO v_track_var
      FROM public.product_variations WHERE id = v_variation_id AND product_id = v_product_id;
      IF v_track_var IS NULL OR NOT v_track_var THEN
        CONTINUE;
      END IF;

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
