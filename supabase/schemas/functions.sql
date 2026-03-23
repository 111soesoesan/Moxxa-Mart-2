-- ============================================================
-- MOXXA MART — CUSTOM SQL FUNCTIONS (FINAL STATE)
-- ============================================================
-- All functions are in the public schema unless noted.
-- Functions marked SECURITY DEFINER run as the owner (postgres),
-- bypassing RLS — appropriate for trigger-based automation.
-- ============================================================


-- ─── set_updated_at ─────────────────────────────────────────
-- Generic BEFORE UPDATE trigger function: stamps updated_at = NOW().
-- Used by: profiles, shops, products, orders, billing_proofs,
--          payment_methods, product_variations, inventory.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─── handle_updated_at ──────────────────────────────────────
-- Alias of set_updated_at, used by shop_blogs.
-- NOTE: functionally identical to set_updated_at — consider
--       consolidating to a single function in future cleanup.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─── handle_new_user ────────────────────────────────────────
-- Creates a profiles row when a new user signs up via auth.users.
-- SECURITY DEFINER: bypasses RLS to always insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;


-- ─── create_default_cash_payment ────────────────────────────
-- Auto-creates a "Cash on Delivery" payment method for every
-- newly inserted shop.
-- History: initially had a bug (inserted into public.payments —
--          a non-existent table). Fixed in migration 20260315101500.
-- SECURITY DEFINER: bypasses RLS.
CREATE OR REPLACE FUNCTION public.create_default_cash_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.payment_methods (shop_id, type, name, description, is_active)
  VALUES (NEW.id, 'cash', 'Cash on Delivery', 'Payment on delivery', TRUE);
  RETURN NEW;
END;
$$;


-- ─── create_inventory_on_product_insert ─────────────────────
-- Auto-creates an inventory row when a simple product is inserted.
-- Variable products skip this; their variations each get a row via
-- create_inventory_on_variation_insert instead.
-- SECURITY DEFINER: bypasses RLS.
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


-- ─── create_inventory_on_variation_insert ───────────────────
-- Auto-creates an inventory row (with variation_id) whenever a
-- new product variation is inserted.
-- SECURITY DEFINER: bypasses RLS.
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


-- ─── sync_inventory_to_variation ────────────────────────────
-- Keeps product_variations.stock_quantity in sync whenever
-- an inventory row's stock_quantity changes (for variation rows only).
-- SECURITY DEFINER: bypasses RLS.
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


-- ─── try_reserve_inventory_line / release_inventory_reservation_line ───
-- Atomic reservation for pending checkout; release on pending cancel/delete.
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


-- ─── deduct_inventory_on_confirmation ───────────────────────
-- On confirm: deduct stock and release matching reservation; respect variation track_inventory.
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


-- ─── restore_inventory_on_cancel ────────────────────────────
-- Pending → cancelled/refunded: release reservation only.
-- Confirmed+ → inactive: restore stock (variation or simple).
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
BEGIN
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


-- ─── trigger_inventory_update_timestamp ─────────────────────
-- BEFORE UPDATE: stamps inventory.updated_at = NOW().
-- NOTE: superseded by set_updated_at() attached via inventory_update_timestamp trigger.
CREATE OR REPLACE FUNCTION public.trigger_inventory_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─── trigger_customer_update_timestamp ──────────────────────
-- BEFORE UPDATE: stamps customers.updated_at = NOW().
CREATE OR REPLACE FUNCTION public.trigger_customer_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─── update_inventory_on_order ──────────────────────────────
-- Callable function (not used by any trigger) for manual stock deduction.
-- Raises an exception if stock is insufficient.
CREATE OR REPLACE FUNCTION public.update_inventory_on_order(
  p_inventory_id UUID,
  p_quantity     INTEGER,
  p_order_id     UUID,
  p_user_id      UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM public.inventory WHERE id = p_inventory_id FOR UPDATE;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
  END IF;

  UPDATE public.inventory
  SET stock_quantity = stock_quantity - p_quantity, updated_at = NOW(), last_updated_at = NOW()
  WHERE id = p_inventory_id;

  INSERT INTO public.inventory_logs (
    inventory_id, change_type, quantity_change, previous_quantity, new_quantity, reference_id, created_by
  ) VALUES (
    p_inventory_id, 'sale', -p_quantity, v_current_stock, v_current_stock - p_quantity, p_order_id, p_user_id
  );

  RETURN TRUE;
END;
$$;


-- ─── restore_inventory_on_cancel (callable) ─────────────────
-- Callable version for manual cancellation restores.
CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel_fn(
  p_inventory_id UUID,
  p_quantity     INTEGER,
  p_order_id     UUID,
  p_user_id      UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM public.inventory WHERE id = p_inventory_id FOR UPDATE;

  UPDATE public.inventory
  SET stock_quantity = stock_quantity + p_quantity, updated_at = NOW(), last_updated_at = NOW()
  WHERE id = p_inventory_id;

  INSERT INTO public.inventory_logs (
    inventory_id, change_type, quantity_change, previous_quantity, new_quantity, reference_id, created_by
  ) VALUES (
    p_inventory_id, 'cancel', p_quantity, v_current_stock, v_current_stock + p_quantity, p_order_id, p_user_id
  );

  RETURN TRUE;
END;
$$;


-- ─── manual_inventory_update ────────────────────────────────
-- Callable function for setting inventory to an absolute quantity.
-- Auto-detects whether to log as 'restock' or 'manual_update'.
CREATE OR REPLACE FUNCTION public.manual_inventory_update(
  p_inventory_id UUID,
  p_new_quantity INTEGER,
  p_change_type  VARCHAR,
  p_notes        TEXT DEFAULT NULL,
  p_user_id      UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM public.inventory WHERE id = p_inventory_id FOR UPDATE;

  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  UPDATE public.inventory
  SET stock_quantity = p_new_quantity, updated_at = NOW(), last_updated_at = NOW()
  WHERE id = p_inventory_id;

  INSERT INTO public.inventory_logs (
    inventory_id, change_type, quantity_change, previous_quantity, new_quantity, notes, created_by
  ) VALUES (
    p_inventory_id,
    CASE WHEN p_new_quantity > v_current_stock THEN 'restock' ELSE 'manual_update' END,
    p_new_quantity - v_current_stock,
    v_current_stock,
    p_new_quantity,
    p_notes,
    p_user_id
  );

  RETURN TRUE;
END;
$$;


-- ─── update_customer_stats_on_order ─────────────────────────
-- Callable function: increments total_orders/total_spent for a customer.
CREATE OR REPLACE FUNCTION public.update_customer_stats_on_order(
  p_customer_id UUID,
  p_order_total DECIMAL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.customers
  SET total_orders = total_orders + 1,
      total_spent  = total_spent + p_order_total,
      last_order_at = NOW(),
      first_order_at = COALESCE(first_order_at, NOW()),
      updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO public.customer_activity (customer_id, activity_type, description)
  VALUES (p_customer_id, 'order', 'Order placed for ' || p_order_total || ' currency units');

  RETURN TRUE;
END;
$$;


-- ─── is_admin ───────────────────────────────────────────────
-- Checks if the authenticated user has the 'admin' role in profiles.
-- SECURITY DEFINER allows reading profiles even if RLS is somehow restrictive.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ─── update_customer_stats_on_order_insert ───────────────────
-- Auto-updates customer total_orders, total_spent, and last_order_at.
-- Also logs the activity in public.customer_activity.
CREATE OR REPLACE FUNCTION public.update_customer_stats_on_order_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.customers
  SET
    total_orders  = total_orders + 1,
    total_spent   = total_spent + NEW.total,
    last_order_at = NEW.created_at,
    first_order_at = COALESCE(first_order_at, NEW.created_at),
    updated_at    = NOW()
  WHERE id = NEW.customer_id;

  INSERT INTO public.customer_activity (customer_id, activity_type, reference_id, description, metadata)
  VALUES (
    NEW.customer_id,
    'order',
    NEW.id,
    'Order placed for ' || NEW.total || ' (Order #' || substring(NEW.id::text, 1, 8) || ')',
    jsonb_build_object(
      'order_id',   NEW.id,
      'total',      NEW.total,
      'shop_id',    NEW.shop_id,
      'status',     NEW.status,
      'channel',    COALESCE(NEW.customer_snapshot->>'channel', 'web')
    )
  );

  RETURN NEW;
END;
$$;


-- ─── adjust_customer_stats_on_order_cancel ─────────────────
-- Decrements customer stats when an order is cancelled or refunded.
CREATE OR REPLACE FUNCTION public.adjust_customer_stats_on_order_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status NOT IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('cancelled', 'refunded') THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.customers
  SET
    total_orders = GREATEST(0, total_orders - 1),
    total_spent  = GREATEST(0, total_spent - NEW.total),
    updated_at   = NOW()
  WHERE id = NEW.customer_id;

  INSERT INTO public.customer_activity (customer_id, activity_type, reference_id, description, metadata)
  VALUES (
    NEW.customer_id,
    'order',
    NEW.id,
    'Order ' || NEW.status || ' (Order #' || substring(NEW.id::text, 1, 8) || ')',
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'total', NEW.total)
  );

  RETURN NEW;
END;
$$;


-- ─── update_conversation_on_message_insert ───────────────
-- Updates parent conversation's last_message_at and preview.
CREATE OR REPLACE FUNCTION public.update_conversation_on_message_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.messaging_conversations
  SET
    last_message_at      = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 120),
    unread_count         = CASE
                             WHEN NEW.direction = 'inbound' THEN unread_count + 1
                             ELSE unread_count
                           END,
    updated_at           = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
