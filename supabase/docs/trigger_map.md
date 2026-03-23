# Moxxa Mart — Trigger Map

Each trigger is documented with: table, event, function called, and plain-English explanation of its side effects.

---

## auth.users → on_auth_user_created

| Field | Value |
|---|---|
| **Table** | `auth.users` (Supabase managed) |
| **Event** | AFTER INSERT |
| **Function** | `handle_new_user()` |
| **Security** | SECURITY DEFINER |

**What it does:** When a new user registers (email/password or OAuth), Supabase inserts a row into `auth.users`. This trigger immediately creates a corresponding row in `public.profiles` with the user's `full_name` and `avatar_url` extracted from `raw_user_meta_data`.

**Side effects:** One `profiles` row is created per signup. No other tables are touched.

---

## profiles → set_profiles_updated_at

| Field | Value |
|---|---|
| **Table** | `public.profiles` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `profiles.updated_at = NOW()` on every update.

---

## shops → set_shops_updated_at

| Field | Value |
|---|---|
| **Table** | `public.shops` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `shops.updated_at = NOW()` on every update.

---

## shops → create_default_cash_on_shops

| Field | Value |
|---|---|
| **Table** | `public.shops` |
| **Event** | AFTER INSERT |
| **Function** | `create_default_cash_payment()` |
| **Security** | SECURITY DEFINER |

**What it does:** Immediately after a new shop is created, inserts a "Cash on Delivery" payment method into `payment_methods` for that shop.

**Side effects:** Every shop always has at least one payment method from creation.

**History:** This trigger had a bug in migration 20260315000000 (it tried to insert into `public.payments` which doesn't exist). Fixed in migration 20260315101500 to correctly target `public.payment_methods`.

---

## products → set_products_updated_at

| Field | Value |
|---|---|
| **Table** | `public.products` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `products.updated_at = NOW()` on every update.

---

## products → auto_create_inventory

| Field | Value |
|---|---|
| **Table** | `public.products` |
| **Event** | AFTER INSERT |
| **Function** | `create_inventory_on_product_insert()` |
| **Security** | SECURITY DEFINER |

**What it does:** When a new product is inserted:
- If `product_type = 'simple'` → creates one `inventory` row with `variation_id = NULL`, seeding `stock_quantity` from `products.stock`.
- If `product_type = 'variable'` → does nothing. Inventory rows will be created per variation by the `auto_create_inventory_on_variation` trigger.

**Side effects:** One `inventory` row per simple product, automatically.

---

## product_variations → auto_create_inventory_on_variation

| Field | Value |
|---|---|
| **Table** | `public.product_variations` |
| **Event** | AFTER INSERT |
| **Function** | `create_inventory_on_variation_insert()` |
| **Security** | SECURITY DEFINER |

**What it does:** When a new variation row is inserted, creates a matching `inventory` row with `variation_id` set, seeding `stock_quantity` from `product_variations.stock_quantity`.

**Side effects:** One `inventory` row per variation, automatically.

---

## product_variations → set_product_variations_updated_at

| Field | Value |
|---|---|
| **Table** | `public.product_variations` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `product_variations.updated_at = NOW()` on every update.

---

## orders → set_orders_updated_at

| Field | Value |
|---|---|
| **Table** | `public.orders` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `orders.updated_at = NOW()` on every update.

---

## orders → deduct_inventory_on_order_confirmed

| Field | Value |
|---|---|
| **Table** | `public.orders` |
| **Event** | AFTER UPDATE |
| **Function** | `deduct_inventory_on_confirmation()` |
| **Security** | SECURITY DEFINER |

**What it does:** Fires on every order UPDATE. Only takes effect when `status` transitions from an inactive state (e.g., `pending`, `cancelled`) **to** an active deducted state (`confirmed`, `processing`, `shipped`, `delivered`).

For each item in `items_snapshot`:
1. Respects `products.track_inventory` and, for variation lines, `product_variations.track_inventory` (skips lines that are not tracked).
2. If `variation_id` is present (valid UUID in the JSON), finds `inventory` where `variation_id` matches and `product_id` matches; deducts `stock_quantity` and reduces `reserved_quantity` by the same qty (pending reservations from checkout); updates `inventory` only (`product_variations.stock_quantity` syncs via `sync_inventory_to_variation`).
3. Otherwise finds the simple-product row (`variation_id IS NULL`), deducts stock and reserved, updates `inventory` and `products.stock`.
4. Inserts `inventory_logs` with `change_type = 'sale'`.

Pending orders reserve stock via `try_reserve_inventory_line()` (called from `createOrder`); confirmation clears both physical and reserved counts on the same row.

---

## orders → restore_inventory_on_order_cancelled

| Field | Value |
|---|---|
| **Table** | `public.orders` |
| **Event** | AFTER UPDATE |
| **Function** | `restore_inventory_on_cancel()` |
| **Security** | SECURITY DEFINER |

**What it does:** Fires on every order UPDATE. Only takes effect when `status` transitions from an active deducted state (`confirmed`, `processing`, `shipped`, `delivered`) **to** an inactive state (e.g., `pending`, `cancelled`, `refunded`).

For each item in `items_snapshot`:
1. If the order was **pending** and moves to `cancelled` or `refunded`, releases reservations only (`reserved_quantity` decreases) via `release_inventory_reservation_line()`, respecting per-variation `track_inventory`.
2. If the order was **confirmed** (or processing/shipped/delivered) and moves to an inactive status, restores physical `stock_quantity` as before (variation rows do not update `products.stock`).
3. Inserts `inventory_logs` with `change_type = 'cancel'` for physical restores.

---

## billing_proofs → set_billing_proofs_updated_at

| Field | Value |
|---|---|
| **Table** | `public.billing_proofs` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `billing_proofs.updated_at = NOW()` on every update.

---

## payment_methods → set_payment_methods_updated_at

| Field | Value |
|---|---|
| **Table** | `public.payment_methods` |
| **Event** | BEFORE UPDATE |
| **Function** | `set_updated_at()` |

**What it does:** Stamps `payment_methods.updated_at = NOW()` on every update.

---

## shop_blogs → shop_blogs_updated_at

| Field | Value |
|---|---|
| **Table** | `public.shop_blogs` |
| **Event** | BEFORE UPDATE |
| **Function** | `handle_updated_at()` |

**What it does:** Stamps `shop_blogs.updated_at = NOW()` on every update. Uses `handle_updated_at()` instead of `set_updated_at()` — functionally identical.

---

## inventory → inventory_update_timestamp

| Field | Value |
|---|---|
| **Table** | `public.inventory` |
| **Event** | BEFORE UPDATE |
| **Function** | `trigger_inventory_update_timestamp()` |

**What it does:** Stamps `inventory.updated_at = NOW()` on every update.

---

## inventory → sync_inventory_to_variation_trigger

| Field | Value |
|---|---|
| **Table** | `public.inventory` |
| **Event** | AFTER UPDATE |
| **Function** | `sync_inventory_to_variation()` |
| **Security** | SECURITY DEFINER |

**What it does:** When an `inventory` row with a non-NULL `variation_id` has its `stock_quantity` changed, propagates the new value to `product_variations.stock_quantity`.

This keeps two sources of truth in sync: the authoritative `inventory.stock_quantity` and the denormalized `product_variations.stock_quantity` (used for fast product listing queries).

---

## customers → customer_update_timestamp

| Field | Value |
|---|---|
| **Table** | `public.customers` |
| **Event** | BEFORE UPDATE |
| **Function** | `trigger_customer_update_timestamp()` |

**What it does:** Stamps `customers.updated_at = NOW()` on every update.

---

## Trigger Execution Order for a New Shop

1. `INSERT INTO public.shops …`
2. → `create_default_cash_on_shops` fires → inserts Cash on Delivery into `payment_methods`

## Trigger Execution Order for a New Simple Product

1. `INSERT INTO public.products … (product_type = 'simple')`
2. → `auto_create_inventory` fires → inserts one row into `inventory` (variation_id = NULL)

## Trigger Execution Order for a New Variable Product Variation

1. `INSERT INTO public.product_variations …`
2. → `auto_create_inventory_on_variation` fires → inserts one row into `inventory` (variation_id = pv.id)

## Trigger Execution Order for Order Confirmation

1. `UPDATE public.orders SET status = 'confirmed' …`
2. → `deduct_inventory_on_order_confirmed` fires → loops `items_snapshot`
3. → For each tracked simple product: updates `inventory`, `products.stock`, inserts log

## Trigger Execution Order for Inventory Adjustment (Variation)

1. `UPDATE public.inventory SET stock_quantity = X WHERE variation_id = Y`
2. → `inventory_update_timestamp` fires first (BEFORE) → stamps `updated_at`
3. → `sync_inventory_to_variation_trigger` fires (AFTER) → updates `product_variations.stock_quantity`
