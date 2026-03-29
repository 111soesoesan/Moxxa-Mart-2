-- Platform-wide browse categories (admin-managed). Shops and products reference for marketplace discovery.

CREATE TABLE public.browse_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_browse_categories_updated_at
  BEFORE UPDATE ON public.browse_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shops
  ADD COLUMN browse_category_id uuid REFERENCES public.browse_categories(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD COLUMN browse_category_id uuid REFERENCES public.browse_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_shops_browse_category_id ON public.shops (browse_category_id)
  WHERE browse_category_id IS NOT NULL;

CREATE INDEX idx_products_browse_category_id ON public.products (browse_category_id)
  WHERE browse_category_id IS NOT NULL;

ALTER TABLE public.browse_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active browse categories (marketplace filters, vendor pickers).
CREATE POLICY "browse_categories_select_active"
  ON public.browse_categories FOR SELECT
  USING (is_active = true);

-- Admins: full access (including inactive rows for management).
CREATE POLICY "admin_all_browse_categories"
  ON public.browse_categories FOR ALL
  USING (public.is_admin());

-- Starter rows (optional; admins can edit/remove).
INSERT INTO public.browse_categories (slug, name, description, sort_order) VALUES
  ('electronics', 'Electronics', NULL, 10),
  ('fashion', 'Fashion', NULL, 20),
  ('home-living', 'Home & Living', NULL, 30),
  ('food-beverages', 'Food & Beverages', NULL, 40),
  ('sports-outdoors', 'Sports & Outdoors', NULL, 50),
  ('beauty-health', 'Beauty & Health', NULL, 60),
  ('books-media', 'Books & Media', NULL, 70),
  ('other', 'Other', NULL, 100)
ON CONFLICT (slug) DO NOTHING;
