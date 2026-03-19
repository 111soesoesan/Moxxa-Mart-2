-- ============================================================
-- Product Management System
-- Adds: product_type, status, sku, sale_price, main_image,
--       gallery_images to products.
-- New tables: categories, attributes, attribute_items,
--             product_categories, product_variations
-- ============================================================

-- 1. Extend products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'simple'
    CHECK (product_type IN ('simple', 'variable')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS sale_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS main_image TEXT,
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing data: populate status, main_image, gallery_images
UPDATE public.products
SET
  status = CASE WHEN is_active THEN 'active' ELSE 'draft' END,
  main_image = CASE
    WHEN array_length(image_urls, 1) > 0 THEN image_urls[1]
    ELSE NULL
  END,
  gallery_images = COALESCE(image_urls, '{}');

-- 2. Categories table (shop-scoped)
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, slug)
);

-- 3. Attributes table
CREATE TABLE IF NOT EXISTS public.attributes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  attribute_type TEXT NOT NULL DEFAULT 'select'
    CHECK (attribute_type IN ('select', 'color', 'text')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Attribute Items table
CREATE TABLE IF NOT EXISTS public.attribute_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value        TEXT NOT NULL,
  color_code   TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Product ↔ Categories junction
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- 6. Product Variations
CREATE TABLE IF NOT EXISTS public.product_variations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_combination JSONB NOT NULL DEFAULT '{}',
  sku                   TEXT,
  price                 NUMERIC(12, 2),
  sale_price            NUMERIC(12, 2),
  stock_quantity        INTEGER NOT NULL DEFAULT 0,
  image_url             TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_shop_id         ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_attributes_shop_id         ON public.attributes(shop_id);
CREATE INDEX IF NOT EXISTS idx_attr_items_attribute_id    ON public.attribute_items(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_cats_product_id    ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_cats_category_id   ON public.product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_vars_product_id    ON public.product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type      ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_status            ON public.products(status);

-- updated_at trigger for product_variations
CREATE TRIGGER set_product_variations_updated_at
  BEFORE UPDATE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- RLS: categories
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR shop_id IN (SELECT id FROM public.shops WHERE status = 'active')
  );

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- RLS: attributes
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attributes_select" ON public.attributes
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "attributes_insert" ON public.attributes
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "attributes_update" ON public.attributes
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "attributes_delete" ON public.attributes
  FOR DELETE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- RLS: attribute_items
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.attribute_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attr_items_select" ON public.attribute_items
  FOR SELECT USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_insert" ON public.attribute_items
  FOR INSERT WITH CHECK (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_update" ON public.attribute_items
  FOR UPDATE USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_delete" ON public.attribute_items
  FOR DELETE USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- RLS: product_categories
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_cats_select" ON public.product_categories
  FOR SELECT USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid() OR p.is_active = TRUE
    )
  );

CREATE POLICY "product_cats_insert" ON public.product_categories
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_cats_delete" ON public.product_categories
  FOR DELETE USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- RLS: product_variations
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_vars_select" ON public.product_variations
  FOR SELECT USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid() OR p.is_active = TRUE
    )
  );

CREATE POLICY "product_vars_insert" ON public.product_variations
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_vars_update" ON public.product_variations
  FOR UPDATE USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_vars_delete" ON public.product_variations
  FOR DELETE USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );
