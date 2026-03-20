-- ============================================================
-- MOXXA MART — INDEXES (FINAL STATE)
-- ============================================================

-- ─── PAYMENT METHODS ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_methods_shop_id   ON public.payment_methods(shop_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type      ON public.payment_methods(type);

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id  ON public.orders(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id        ON public.orders(customer_id);

-- ─── PRODUCTS ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_shop_id          ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type     ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_status           ON public.products(status);

-- ─── SHOP BLOGS ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS shop_blogs_shop_id_idx        ON public.shop_blogs(shop_id);
CREATE INDEX IF NOT EXISTS shop_blogs_created_at_idx     ON public.shop_blogs(created_at DESC);

-- ─── BLOG ENGAGEMENT ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS blog_likes_blog_id_idx        ON public.blog_likes(blog_id);
CREATE INDEX IF NOT EXISTS blog_comments_blog_id_idx     ON public.blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS blog_shares_blog_id_idx       ON public.blog_shares(blog_id);

-- ─── INVENTORY ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_product_id      ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id         ON public.inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variation_id    ON public.inventory(variation_id);

-- Partial index: low-stock detection (stock_quantity at or below threshold)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON public.inventory(stock_quantity, low_stock_threshold)
  WHERE stock_quantity <= low_stock_threshold;

-- Partial unique indexes for variation-aware uniqueness:
--   One inventory row per simple product (variation_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_simple_product
  ON public.inventory(product_id) WHERE variation_id IS NULL;

--   One inventory row per variation (variation_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_variation_unique
  ON public.inventory(variation_id) WHERE variation_id IS NOT NULL;

-- ─── INVENTORY LOGS ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_logs_inventory_id ON public.inventory_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reference_id ON public.inventory_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type  ON public.inventory_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at   ON public.inventory_logs(created_at DESC);

-- ─── CUSTOMERS ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_shop_id           ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id           ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email             ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent       ON public.customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_at     ON public.customers(last_order_at DESC);

-- ─── CUSTOMER ACTIVITY ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer_id ON public.customer_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type        ON public.customer_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_created_at  ON public.customer_activity(created_at DESC);

-- ─── PRODUCT MANAGEMENT ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_categories_shop_id         ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_attributes_shop_id         ON public.attributes(shop_id);
CREATE INDEX IF NOT EXISTS idx_attr_items_attribute_id    ON public.attribute_items(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_cats_product_id    ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_cats_category_id   ON public.product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_vars_product_id    ON public.product_variations(product_id);
