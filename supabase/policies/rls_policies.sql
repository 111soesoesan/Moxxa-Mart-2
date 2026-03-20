-- ============================================================
-- MOXXA MART — ROW LEVEL SECURITY POLICIES (FINAL STATE)
-- ============================================================
-- All tables have RLS enabled. Policies are grouped by table.
-- Service role bypasses all RLS (Supabase default behaviour).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- TABLE: public.profiles
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read any profile (needed for shop owner display, etc.)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.shops
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Active shops are visible to all; owners can always see their own
-- (replaces original "shops_select_active" which only checked is_active)
CREATE POLICY "shops_select_active"
  ON public.shops FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id);

CREATE POLICY "shops_insert_own"
  ON public.shops FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shops_update_own"
  ON public.shops FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "shops_delete_own"
  ON public.shops FOR DELETE
  USING (auth.uid() = owner_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.products
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Active products visible to all; shop owner sees all their products
CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (
    is_active = TRUE
    OR auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  USING (
    auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );

CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  USING (
    auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id)
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: public.orders
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Authenticated users see their own orders; guests rely on service role
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Anyone can place an order (covers guest checkout)
CREATE POLICY "orders_insert_any"
  ON public.orders FOR INSERT WITH CHECK (TRUE);

-- Users can update their own orders (e.g. add payment proof)
CREATE POLICY "orders_update_own"
  ON public.orders FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.billing_proofs
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.billing_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_proofs_select_own"
  ON public.billing_proofs FOR SELECT
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "billing_proofs_insert_own"
  ON public.billing_proofs FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.payment_methods
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own"
  ON public.payment_methods FOR SELECT
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_insert_own"
  ON public.payment_methods FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_update_own"
  ON public.payment_methods FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "payment_methods_delete_own"
  ON public.payment_methods FOR DELETE
  USING (auth.uid() = (SELECT owner_id FROM public.shops WHERE id = shop_id));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.shop_blogs
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shop_blogs ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "public read published blogs"
  ON public.shop_blogs FOR SELECT USING (published = TRUE);

-- Vendor can read ALL their shop's posts (including drafts)
CREATE POLICY "vendor read own shop blogs"
  ON public.shop_blogs FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "vendor insert blogs"
  ON public.shop_blogs FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "vendor update blogs"
  ON public.shop_blogs FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.shops WHERE id = shop_id));

CREATE POLICY "vendor delete blogs"
  ON public.shop_blogs FOR DELETE
  USING (auth.uid() IN (SELECT owner_id FROM public.shops WHERE id = shop_id));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.blog_likes
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read likes"
  ON public.blog_likes FOR SELECT USING (TRUE);

CREATE POLICY "auth users insert likes"
  ON public.blog_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth users delete own likes"
  ON public.blog_likes FOR DELETE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.blog_comments
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read comments"
  ON public.blog_comments FOR SELECT USING (TRUE);

CREATE POLICY "auth users insert comments"
  ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "auth users delete own comments"
  ON public.blog_comments FOR DELETE USING (auth.uid() = author_id);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.blog_shares
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.blog_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read shares"
  ON public.blog_shares FOR SELECT USING (TRUE);

-- Anyone can record a share (including guests)
CREATE POLICY "anyone insert shares"
  ON public.blog_shares FOR INSERT WITH CHECK (TRUE);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.inventory
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_select_policy
  ON public.inventory FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY inventory_insert_policy
  ON public.inventory FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY inventory_update_policy
  ON public.inventory FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.inventory_logs
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_logs_select_policy
  ON public.inventory_logs FOR SELECT
  USING (
    inventory_id IN (
      SELECT id FROM public.inventory
      WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: public.customers
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_policy
  ON public.customers FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Open insert: allows triggers and service-role inserts from order flow
CREATE POLICY customers_insert_policy
  ON public.customers FOR INSERT WITH CHECK (TRUE);

CREATE POLICY customers_update_policy
  ON public.customers FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.customer_activity
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.customer_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_activity_select_policy
  ON public.customer_activity FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

-- Open insert: allows triggers and internal automation
CREATE POLICY customer_activity_insert_policy
  ON public.customer_activity FOR INSERT WITH CHECK (TRUE);


-- ────────────────────────────────────────────────────────────
-- TABLE: public.categories
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select"
  ON public.categories FOR SELECT
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR shop_id IN (SELECT id FROM public.shops WHERE status = 'active')
  );

CREATE POLICY "categories_insert"
  ON public.categories FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "categories_update"
  ON public.categories FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "categories_delete"
  ON public.categories FOR DELETE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.attributes
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attributes_select"
  ON public.attributes FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "attributes_insert"
  ON public.attributes FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "attributes_update"
  ON public.attributes FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "attributes_delete"
  ON public.attributes FOR DELETE
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- TABLE: public.attribute_items
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.attribute_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attr_items_select"
  ON public.attribute_items FOR SELECT
  USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_insert"
  ON public.attribute_items FOR INSERT
  WITH CHECK (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_update"
  ON public.attribute_items FOR UPDATE
  USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "attr_items_delete"
  ON public.attribute_items FOR DELETE
  USING (
    attribute_id IN (
      SELECT a.id FROM public.attributes a
      JOIN public.shops s ON s.id = a.shop_id WHERE s.owner_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: public.product_categories
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_cats_select"
  ON public.product_categories FOR SELECT
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid() OR p.is_active = TRUE
    )
  );

CREATE POLICY "product_cats_insert"
  ON public.product_categories FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_cats_delete"
  ON public.product_categories FOR DELETE
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- TABLE: public.product_variations
-- RLS: ENABLED
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_vars_select"
  ON public.product_variations FOR SELECT
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid() OR p.is_active = TRUE
    )
  );

CREATE POLICY "product_vars_insert"
  ON public.product_variations FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_vars_update"
  ON public.product_variations FOR UPDATE
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_vars_delete"
  ON public.product_variations FOR DELETE
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.shops s ON s.id = p.shop_id
      WHERE s.owner_id = auth.uid()
    )
  );
