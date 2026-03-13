-- ============================================================
-- Baseline Schema: Profiles, Shops, Products, Orders
-- ============================================================

-- ─── PROFILES ───────────────────────────────────────────────
-- One row per auth.users user, created automatically on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile row when a new user signs up.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── SHOPS ──────────────────────────────────────────────────
-- Multi-vendor: each vendor can own one or more shops.
CREATE TABLE IF NOT EXISTS public.shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRODUCTS ───────────────────────────────────────────────
-- Extensible via JSONB: store dynamic attributes and variants
-- without schema changes.
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls  TEXT[] NOT NULL DEFAULT '{}',
  attributes  JSONB NOT NULL DEFAULT '{}',  -- e.g. {"color":"red","size":"M"}
  variants    JSONB NOT NULL DEFAULT '[]',  -- e.g. [{"sku":"X1","price":99,"stock":5}]
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, slug)
);

-- ─── ORDERS ─────────────────────────────────────────────────
-- Supports guest (no user_id) and authenticated checkouts.
-- JSONB snapshots preserve product/pricing state at order time.
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL = guest
  shop_id           UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  -- Snapshot of line items: [{product_id, name, price, qty, variant, image_url}]
  items_snapshot    JSONB NOT NULL DEFAULT '[]',
  -- Snapshot of customer details (guest or logged-in)
  customer_snapshot JSONB NOT NULL DEFAULT '{}',
  subtotal          NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total             NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  -- Manual payment: store URL of uploaded bank/wallet proof
  payment_method    TEXT NOT NULL DEFAULT 'manual',
  payment_proof_url TEXT,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid','pending_verification','paid','refunded')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, but only update their own.
CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Shops: anyone can read active shops; only owner can insert/update/delete.
CREATE POLICY "shops_select_active"  ON public.shops FOR SELECT USING (is_active = TRUE);
CREATE POLICY "shops_insert_own"     ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "shops_update_own"     ON public.shops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "shops_delete_own"     ON public.shops FOR DELETE USING (auth.uid() = owner_id);

-- Products: anyone can read active products; only shop owner can mutate.
CREATE POLICY "products_select_active" ON public.products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "products_insert_own"    ON public.products FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));
CREATE POLICY "products_update_own"    ON public.products FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));
CREATE POLICY "products_delete_own"    ON public.products FOR DELETE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

-- Orders: users see their own; guests cannot read via RLS (server-side service role used for guest orders).
CREATE POLICY "orders_select_own"    ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_any"    ON public.orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "orders_update_own"    ON public.orders FOR UPDATE USING (auth.uid() = user_id);
