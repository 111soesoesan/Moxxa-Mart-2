-- ============================================================
-- OMNICHANNEL CUSTOMER IDENTITY RESOLUTION
-- Adds customer_identities table, preferred_channel column,
-- fixes email unique constraint to be partial (allow NULL),
-- adds phone unique partial index, and a trigger to auto-update
-- customer stats whenever an order is created.
-- ============================================================


-- ─── 1. Add preferred_channel to customers ───────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT NOT NULL DEFAULT 'web'
    CHECK (preferred_channel IN ('web', 'whatsapp', 'telegram', 'messenger', 'instagram', 'phone'));


-- ─── 2. Fix email unique constraint → partial index ──────────
-- The original constraint treated NULL as a unique value per shop which
-- prevents multiple guest-only (no email) customers in the same shop.
-- Dropping and replacing with a partial index (WHERE email IS NOT NULL)
-- allows many NULL-email rows while still enforcing uniqueness for real emails.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_shop_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS customers_shop_email_unique
  ON public.customers(shop_id, email)
  WHERE email IS NOT NULL;


-- ─── 3. Add phone unique partial index ───────────────────────
-- Enforces one customer record per phone per shop (when phone is provided).
-- NULL phones are excluded so guest records without phone are allowed freely.
CREATE UNIQUE INDEX IF NOT EXISTS customers_shop_phone_unique
  ON public.customers(shop_id, phone)
  WHERE phone IS NOT NULL;


-- ─── 4. Extend customer_activity CHECK to include 'channel_connected' ─
-- The existing constraint already has 'order'. We add 'channel_connected'
-- for identity linkage events, and 'order_placed' as an alias used by code.
ALTER TABLE public.customer_activity
  DROP CONSTRAINT IF EXISTS customer_activity_activity_type_check;

ALTER TABLE public.customer_activity
  ADD CONSTRAINT customer_activity_activity_type_check
    CHECK (activity_type IN (
      'order', 'order_placed', 'message', 'visit', 'review', 'note', 'tag', 'channel_connected'
    ));


-- ─── 5. customer_identities table ────────────────────────────
-- Links a customer record to a platform-specific identifier
-- (e.g., WhatsApp phone, Telegram chat ID, Messenger PSID).
CREATE TABLE IF NOT EXISTS public.customer_identities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  platform    TEXT        NOT NULL
                CHECK (platform IN ('web', 'whatsapp', 'telegram', 'messenger', 'instagram', 'phone')),
  platform_id TEXT        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one identity entry per customer per platform
  UNIQUE (customer_id, platform)
);

-- Index for fast reverse lookup: given a platform+ID, find the customer
CREATE INDEX IF NOT EXISTS customer_identities_platform_lookup_idx
  ON public.customer_identities(platform, platform_id);


-- ─── 6. RLS for customer_identities ──────────────────────────
ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;

-- Vendors can read identities for customers in their own shops
CREATE POLICY "vendors_read_own_shop_customer_identities"
  ON public.customer_identities FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.customers c
      JOIN public.shops s ON s.id = c.shop_id
      WHERE c.id = customer_identities.customer_id
        AND s.owner_id = auth.uid()
    )
  );

-- Service role has full access (bypasses RLS naturally, but explicit for clarity)
CREATE POLICY "service_role_full_access_customer_identities"
  ON public.customer_identities FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 7. Auto-update customer stats on order INSERT ───────────
-- Replaces the need to manually call update_customer_stats_on_order from
-- application code. Fires after a new order row is inserted.
-- Only updates if customer_id is set (does nothing for orphaned orders).
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

CREATE TRIGGER trg_update_customer_stats_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats_on_order_insert();


-- ─── 8. Adjust customer stats on order cancel/refund ─────────
-- When an order transitions to cancelled or refunded, decrement stats
-- so that total_orders and total_spent remain accurate.
CREATE OR REPLACE FUNCTION public.adjust_customer_stats_on_order_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only act when status moves INTO cancelled or refunded FROM an active state
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

CREATE TRIGGER trg_adjust_customer_stats_on_order_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_customer_stats_on_order_cancel();
