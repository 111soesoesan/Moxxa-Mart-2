-- ============================================================
-- MOXXA MART — FOREIGN KEY RELATIONSHIPS (FINAL STATE)
-- This file lists every FK for quick reference.
-- The constraints are already embedded in tables.sql.
-- ============================================================

-- ─── auth.users ──────────────────────────────────────────────
--   profiles.id → auth.users.id  ON DELETE CASCADE

-- ─── profiles ────────────────────────────────────────────────
--   shops.owner_id          → profiles.id  ON DELETE CASCADE
--   orders.user_id          → profiles.id  ON DELETE SET NULL
--   blog_likes.user_id      → profiles.id  ON DELETE CASCADE
--   blog_comments.author_id → profiles.id  ON DELETE CASCADE
--   blog_shares.user_id     → profiles.id  ON DELETE SET NULL
--   shop_blogs.author_id    → profiles.id  ON DELETE SET NULL
--   inventory_logs.created_by → profiles.id ON DELETE SET NULL
--   customers.user_id       → profiles.id  ON DELETE SET NULL

-- ─── shops ───────────────────────────────────────────────────
--   products.shop_id          → shops.id  ON DELETE CASCADE
--   orders.shop_id            → shops.id  ON DELETE RESTRICT
--   billing_proofs.shop_id    → shops.id  ON DELETE CASCADE
--   payment_methods.shop_id   → shops.id  ON DELETE CASCADE
--   shop_blogs.shop_id        → shops.id  ON DELETE CASCADE
--   inventory.shop_id         → shops.id  ON DELETE CASCADE
--   customers.shop_id         → shops.id  ON DELETE CASCADE
--   categories.shop_id        → shops.id  ON DELETE CASCADE
--   attributes.shop_id        → shops.id  ON DELETE CASCADE

-- ─── products ────────────────────────────────────────────────
--   inventory.product_id          → products.id  ON DELETE CASCADE
--   product_categories.product_id → products.id  ON DELETE CASCADE
--   product_variations.product_id → products.id  ON DELETE CASCADE

-- ─── payment_methods ─────────────────────────────────────────
--   orders.payment_method_id → payment_methods.id  ON DELETE SET NULL

-- ─── customers ───────────────────────────────────────────────
--   orders.customer_id         → customers.id  ON DELETE SET NULL
--   customer_activity.customer_id → customers.id  ON DELETE CASCADE

-- ─── inventory ───────────────────────────────────────────────
--   inventory_logs.inventory_id → inventory.id  ON DELETE CASCADE

-- ─── product_variations ──────────────────────────────────────
--   inventory.variation_id → product_variations.id  ON DELETE CASCADE

-- ─── shop_blogs ──────────────────────────────────────────────
--   blog_likes.blog_id    → shop_blogs.id  ON DELETE CASCADE
--   blog_comments.blog_id → shop_blogs.id  ON DELETE CASCADE
--   blog_shares.blog_id   → shop_blogs.id  ON DELETE CASCADE

-- ─── attributes ──────────────────────────────────────────────
--   attribute_items.attribute_id → attributes.id  ON DELETE CASCADE

-- ─── categories ──────────────────────────────────────────────
--   categories.parent_id      → categories.id  ON DELETE SET NULL  (self-ref)
--   product_categories.category_id → categories.id  ON DELETE CASCADE

-- ============================================================
-- ENTITY RELATIONSHIP SUMMARY
-- ============================================================
--
--  auth.users
--    └─ profiles (1:1)
--         ├─ shops (1:N)
--         │    ├─ products (1:N)
--         │    │    ├─ product_variations (1:N)
--         │    │    │    └─ inventory [variation row] (1:1)
--         │    │    ├─ inventory [simple row] (1:1)
--         │    │    │    └─ inventory_logs (1:N)
--         │    │    └─ product_categories (M:N) ── categories
--         │    ├─ orders (1:N)
--         │    │    └─ (customer_snapshot JSONB, items_snapshot JSONB)
--         │    ├─ payment_methods (1:N)
--         │    ├─ shop_blogs (1:N)
--         │    │    ├─ blog_likes (1:N)
--         │    │    ├─ blog_comments (1:N)
--         │    │    └─ blog_shares (1:N)
--         │    ├─ billing_proofs (1:N)
--         │    ├─ customers (1:N)
--         │    │    └─ customer_activity (1:N)
--         │    ├─ categories (1:N, hierarchical)
--         │    └─ attributes (1:N)
--         │         └─ attribute_items (1:N)
--         └─ (orders via user_id — authenticated customer orders)
