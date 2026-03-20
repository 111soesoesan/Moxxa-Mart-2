-- ============================================================
-- MOXXA MART — TRIGGERS (FINAL STATE)
-- Format: trigger name | table | event | function
-- ============================================================
-- All DROP … IF EXISTS guards are included so this file is
-- safe to re-run without conflicts.
-- ============================================================


-- ─── auth.users → profiles ──────────────────────────────────
-- Creates a profile row when a new user signs up.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─── profiles: updated_at ───────────────────────────────────
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── shops: updated_at ──────────────────────────────────────
DROP TRIGGER IF EXISTS set_shops_updated_at ON public.shops;
CREATE TRIGGER set_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── shops: auto-create Cash on Delivery payment method ─────
-- Fires after every shop INSERT.
DROP TRIGGER IF EXISTS create_default_cash_on_shops ON public.shops;
CREATE TRIGGER create_default_cash_on_shops
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_cash_payment();


-- ─── products: updated_at ───────────────────────────────────
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── products: auto-create inventory row (simple only) ──────
-- Variable products are skipped; their variations trigger their own rows.
DROP TRIGGER IF EXISTS auto_create_inventory ON public.products;
CREATE TRIGGER auto_create_inventory
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_product_insert();


-- ─── product_variations: auto-create inventory row ──────────
-- Fires after each variation INSERT; creates a variation-level inventory row.
DROP TRIGGER IF EXISTS auto_create_inventory_on_variation ON public.product_variations;
CREATE TRIGGER auto_create_inventory_on_variation
  AFTER INSERT ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.create_inventory_on_variation_insert();


-- ─── product_variations: updated_at ─────────────────────────
DROP TRIGGER IF EXISTS set_product_variations_updated_at ON public.product_variations;
CREATE TRIGGER set_product_variations_updated_at
  BEFORE UPDATE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── orders: updated_at ─────────────────────────────────────
DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── orders: deduct inventory on confirmation ───────────────
-- Fires AFTER UPDATE on orders. Deducts stock for simple products
-- when status transitions pending/… → confirmed.
DROP TRIGGER IF EXISTS deduct_inventory_on_order_confirmed ON public.orders;
CREATE TRIGGER deduct_inventory_on_order_confirmed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_confirmation();


-- ─── orders: restore inventory on cancellation ──────────────
-- Fires AFTER UPDATE on orders. Restores stock for simple products
-- when status transitions confirmed/processing/shipped/delivered → cancelled.
DROP TRIGGER IF EXISTS restore_inventory_on_order_cancelled ON public.orders;
CREATE TRIGGER restore_inventory_on_order_cancelled
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_cancel();


-- ─── billing_proofs: updated_at ─────────────────────────────
DROP TRIGGER IF EXISTS set_billing_proofs_updated_at ON public.billing_proofs;
CREATE TRIGGER set_billing_proofs_updated_at
  BEFORE UPDATE ON public.billing_proofs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── payment_methods: updated_at ────────────────────────────
DROP TRIGGER IF EXISTS set_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── shop_blogs: updated_at ─────────────────────────────────
DROP TRIGGER IF EXISTS shop_blogs_updated_at ON public.shop_blogs;
CREATE TRIGGER shop_blogs_updated_at
  BEFORE UPDATE ON public.shop_blogs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ─── inventory: updated_at ──────────────────────────────────
DROP TRIGGER IF EXISTS inventory_update_timestamp ON public.inventory;
CREATE TRIGGER inventory_update_timestamp
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_inventory_update_timestamp();


-- ─── inventory: sync stock to variation ─────────────────────
-- AFTER UPDATE: when a variation inventory row's stock_quantity changes,
-- propagates the new value to product_variations.stock_quantity.
DROP TRIGGER IF EXISTS sync_inventory_to_variation_trigger ON public.inventory;
CREATE TRIGGER sync_inventory_to_variation_trigger
  AFTER UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_variation();


-- ─── customers: updated_at ──────────────────────────────────
DROP TRIGGER IF EXISTS customer_update_timestamp ON public.customers;
CREATE TRIGGER customer_update_timestamp
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_customer_update_timestamp();


-- ============================================================
-- TRIGGER MAP SUMMARY
-- ============================================================
--
--  auth.users
--    AFTER INSERT  → on_auth_user_created          → handle_new_user()
--
--  public.profiles
--    BEFORE UPDATE → set_profiles_updated_at        → set_updated_at()
--
--  public.shops
--    BEFORE UPDATE → set_shops_updated_at           → set_updated_at()
--    AFTER  INSERT → create_default_cash_on_shops   → create_default_cash_payment()
--
--  public.products
--    BEFORE UPDATE → set_products_updated_at        → set_updated_at()
--    AFTER  INSERT → auto_create_inventory           → create_inventory_on_product_insert()
--
--  public.product_variations
--    BEFORE UPDATE → set_product_variations_updated_at → set_updated_at()
--    AFTER  INSERT → auto_create_inventory_on_variation → create_inventory_on_variation_insert()
--
--  public.orders
--    BEFORE UPDATE → set_orders_updated_at          → set_updated_at()
--    AFTER  UPDATE → deduct_inventory_on_order_confirmed → deduct_inventory_on_confirmation()
--    AFTER  UPDATE → restore_inventory_on_order_cancelled → restore_inventory_on_cancel()
--
--  public.billing_proofs
--    BEFORE UPDATE → set_billing_proofs_updated_at  → set_updated_at()
--
--  public.payment_methods
--    BEFORE UPDATE → set_payment_methods_updated_at → set_updated_at()
--
--  public.shop_blogs
--    BEFORE UPDATE → shop_blogs_updated_at          → handle_updated_at()
--
--  public.inventory
--    BEFORE UPDATE → inventory_update_timestamp     → trigger_inventory_update_timestamp()
--    AFTER  UPDATE → sync_inventory_to_variation_trigger → sync_inventory_to_variation()
--
--  public.customers
--    BEFORE UPDATE → customer_update_timestamp      → trigger_customer_update_timestamp()
