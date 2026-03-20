-- ============================================================
-- MOXXA MART — CANONICAL TABLE DEFINITIONS
-- Generated from migration history (final reconciled state)
-- Migrations: 20260313200000 → 20260319120000
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_graphql"        WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"           WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault"     WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"          WITH SCHEMA "extensions";


-- ─── PROFILES ───────────────────────────────────────────────
-- One row per auth.users record, auto-created on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  role       TEXT        NOT NULL DEFAULT 'customer'
               CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── SHOPS ──────────────────────────────────────────────────
-- Multi-vendor: each vendor can own one or more shops.
CREATE TABLE IF NOT EXISTS public.shops (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                     TEXT        NOT NULL,
  slug                     TEXT        NOT NULL UNIQUE,
  description              TEXT,
  logo_url                 TEXT,
  cover_url                TEXT,
  phone                    TEXT,
  location                 TEXT,
  delivery_policy          TEXT,
  payment_info             JSONB       NOT NULL DEFAULT '{}',
  allow_guest_purchase     BOOLEAN     NOT NULL DEFAULT TRUE,
  status                   TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'suspended')),
  inspection_requested_at  TIMESTAMPTZ,
  rejection_reason         TEXT,
  subscription_expires_at  TIMESTAMPTZ,
  -- Branding & promotions (migration 20260316000000)
  profile_image_url        TEXT,
  banner_image_url         TEXT,
  promotion_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
  promotion_title          TEXT,
  promotion_body           TEXT,
  promotion_button_text    TEXT,
  promotion_button_link    TEXT,
  shop_bio                 TEXT,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shops_shop_bio_length CHECK (char_length(shop_bio) <= 200)
);


-- ─── PRODUCTS ───────────────────────────────────────────────
-- Supports simple and variable product types.
-- Inventory tracked via the separate inventory table.
CREATE TABLE IF NOT EXISTS public.products (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name                 TEXT          NOT NULL,
  slug                 TEXT          NOT NULL,
  description          TEXT,
  price                NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock                INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls           TEXT[]        NOT NULL DEFAULT '{}',
  attributes           JSONB         NOT NULL DEFAULT '{}',
  variants             JSONB         NOT NULL DEFAULT '[]',
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Extended columns (migration 20260313210000)
  category             TEXT,
  condition            TEXT          NOT NULL DEFAULT 'new'
                         CHECK (condition IN ('new', 'used_like_new', 'used_good', 'used_fair')),
  list_on_marketplace  BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Payment methods (migration 20260315000000)
  payment_method_ids   UUID[]        NOT NULL DEFAULT '{}',
  -- Inventory tracking flag (migration 20260317110000)
  track_inventory      BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Product management system (migration 20260319000000)
  product_type         TEXT          NOT NULL DEFAULT 'simple'
                         CHECK (product_type IN ('simple', 'variable')),
  status               TEXT          NOT NULL DEFAULT 'active'
                         CHECK (status IN ('draft', 'active', 'archived')),
  sku                  TEXT,
  sale_price           NUMERIC(12,2),
  sale_start           TIMESTAMPTZ,
  sale_end             TIMESTAMPTZ,
  main_image           TEXT,
  gallery_images       TEXT[]        NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, slug)
);


-- ─── ORDERS ─────────────────────────────────────────────────
-- Supports guest (user_id = NULL) and authenticated checkouts.
-- JSONB snapshots preserve product/pricing state at order time.
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  shop_id           UUID          NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  status            TEXT          NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  items_snapshot    JSONB         NOT NULL DEFAULT '[]',
  customer_snapshot JSONB         NOT NULL DEFAULT '{}',
  subtotal          NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total             NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  payment_method    TEXT          NOT NULL DEFAULT 'manual',
  payment_proof_url TEXT,
  payment_status    TEXT          NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid','pending_verification','paid','refunded')),
  notes             TEXT,
  -- Extended columns
  payment_method_id UUID          REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  customer_id       UUID          REFERENCES public.customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─── BILLING PROOFS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_proofs (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  screenshot_url TEXT          NOT NULL,
  status         TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes    TEXT,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─── PAYMENT METHODS ────────────────────────────────────────
-- Shop-scoped payment methods (Cash on Delivery auto-created on shop insert).
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('cash', 'bank')),
  name             TEXT        NOT NULL,
  description      TEXT,
  bank_name        TEXT,
  account_holder   TEXT,
  account_number   TEXT,
  proof_required   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_payment_method_per_shop UNIQUE (shop_id, name)
);


-- ─── SHOP BLOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_blogs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  image_urls  TEXT[]      NOT NULL DEFAULT '{}',
  category    TEXT,
  published   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── BLOG LIKES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id    UUID        NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blog_id, user_id)
);


-- ─── BLOG COMMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id    UUID        NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── BLOG SHARES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_shares (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id    UUID        NOT NULL REFERENCES public.shop_blogs(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── INVENTORY ──────────────────────────────────────────────
-- One row per simple product, one row per product variation.
-- Partial unique indexes enforce uniqueness (see indexes.sql).
CREATE TABLE IF NOT EXISTS public.inventory (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  shop_id            UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- NULL = simple product row; NOT NULL = variation row
  variation_id       UUID        REFERENCES public.product_variations(id) ON DELETE CASCADE,
  stock_quantity     INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity  INTEGER     NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold INTEGER    NOT NULL DEFAULT 5,
  sku                TEXT,
  last_updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_reserved_less_than_stock CHECK (reserved_quantity <= stock_quantity)
);


-- ─── INVENTORY LOGS ─────────────────────────────────────────
-- Full audit trail for all stock changes.
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id      UUID        NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE ON UPDATE CASCADE,
  change_type       VARCHAR(50) NOT NULL
                      CHECK (change_type IN ('sale','manual_update','restock','cancel','reservation','return')),
  quantity_change   INTEGER     NOT NULL,
  previous_quantity INTEGER,
  new_quantity      INTEGER,
  reference_id      UUID,
  notes             TEXT,
  created_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── CUSTOMERS ──────────────────────────────────────────────
-- Per-shop customer records for CRM / analytics.
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id         UUID          REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  name            VARCHAR(255)  NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(20),
  total_orders    INTEGER       NOT NULL DEFAULT 0,
  total_spent     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  last_order_at   TIMESTAMPTZ,
  first_order_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_shop_email_unique UNIQUE (shop_id, email)
);


-- ─── CUSTOMER ACTIVITY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_activity (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  activity_type VARCHAR(50) NOT NULL
                  CHECK (activity_type IN ('order','message','visit','review','note','tag')),
  reference_id  UUID,
  description   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── CATEGORIES ─────────────────────────────────────────────
-- Shop-scoped, self-referencing for hierarchy.
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  parent_id   UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, slug)
);


-- ─── ATTRIBUTES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attributes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  attribute_type TEXT        NOT NULL DEFAULT 'select'
                   CHECK (attribute_type IN ('select', 'color', 'text')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── ATTRIBUTE ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attribute_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID        NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value        TEXT        NOT NULL,
  color_code   TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── PRODUCT CATEGORIES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);


-- ─── PRODUCT VARIATIONS ─────────────────────────────────────
-- Each row is a specific SKU of a variable product.
CREATE TABLE IF NOT EXISTS public.product_variations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID          NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_combination JSONB         NOT NULL DEFAULT '{}',
  sku                   TEXT,
  price                 NUMERIC(12,2),
  sale_price            NUMERIC(12,2),
  stock_quantity        INTEGER       NOT NULL DEFAULT 0,
  image_url             TEXT,
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
