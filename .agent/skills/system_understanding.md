# Skill: System Understanding

> Load this skill BEFORE making any changes. Understand the system first.

---

## Where to Start Reading

Read these files in order to build a mental model of the system:

| Order | File | What You Learn |
|---|---|---|
| 1 | `/supabase/docs/architecture.md` | All 19 tables, entity relationships, design decisions (inventory model, JSONB snapshots, guest checkout, shop lifecycle) |
| 2 | `/supabase/docs/rls_map.md` | Every RLS policy per table — who can SELECT, INSERT, UPDATE, DELETE and under what conditions |
| 3 | `/supabase/docs/trigger_map.md` | Every trigger, what fires it, side effects, and execution order chains |
| 4 | `/supabase/schemas/tables.sql` | Full DDL for all tables |
| 5 | `/supabase/schemas/relationships.sql` | Foreign keys and CASCADE rules |
| 6 | `/supabase/schemas/indexes.sql` | Performance indexes including partial unique indexes for inventory |
| 7 | `/supabase/schemas/functions.sql` | All PL/pgSQL functions (trigger handlers, callable functions) |

---

## Core Domain Model

```
Identity & Shops     →  profiles, shops
Catalogue            →  products, product_variations, categories, attributes, attribute_items, product_categories
Commerce             →  orders, payment_methods, billing_proofs
Operations           →  inventory, inventory_logs, customers, customer_activity
Content              →  shop_blogs, blog_likes, blog_comments, blog_shares
```

### Key Relationships

- `auth.users` → `profiles` (1:1, created by trigger on signup)
- `profiles` → `shops` (1:N, owner_id)
- `shops` → `products` (1:N) → `product_variations` (1:N for variable products)
- `products`/`product_variations` → `inventory` (1:1 each, auto-created by triggers)
- `shops` → `orders` (1:N via shop_id) and `auth.users` → `orders` (1:N via user_id, nullable for guests)
- `shops` → `customers` (1:N, per-shop CRM)

---

## How RLS Controls Access

RLS enforces a **shop-owner-centric** model:

- **Shop owners** can CRUD their own shop's data (products, orders, inventory, payment methods, etc.)
- **Public users** can read active shops, active products, published blogs
- **Guest checkout** is supported — `orders.user_id` can be NULL; guest data is accessed server-side via service role
- **All trigger functions** run as SECURITY DEFINER (bypass RLS)
- **Service role** bypasses all policies — used for server-side actions

### Critical RLS Patterns to Know

- Ownership checks use `auth.uid()` matched against `owner_id` or traversed via FK chains (e.g., `inventory → products → shops → owner_id`)
- `WITH CHECK (TRUE)` on orders/customers/customer_activity INSERT — intentional for guest flows
- `inventory_logs` has NO client INSERT policy — writes happen only through SECURITY DEFINER triggers

---

## How Triggers Drive Business Logic

Triggers automate critical operations. Modifying them incorrectly can break inventory, payments, or user creation.

### Auto-Creation Chain
- **User signup** → `handle_new_user()` → creates `profiles` row
- **Shop creation** → `create_default_cash_payment()` → creates Cash on Delivery in `payment_methods`
- **Product insert (simple)** → `create_inventory_on_product_insert()` → creates `inventory` row
- **Variation insert** → `create_inventory_on_variation_insert()` → creates `inventory` row with `variation_id`

### Inventory Lifecycle
- **Order confirmed** → `deduct_inventory_on_confirmation()` → deducts stock, logs it (simple products only)
- **Order cancelled** → `restore_inventory_on_cancel()` → restores stock, logs it
- **Inventory updated (variation)** → `sync_inventory_to_variation()` → syncs to `product_variations.stock_quantity`

### Timestamps
- `set_updated_at()` / `handle_updated_at()` fire on BEFORE UPDATE for most tables

---

## Rules

1. **NEVER assume schema.** Always read `/supabase/docs/architecture.md` and relevant schema files first.
2. **ALWAYS read before modifying.** Check the current state of tables, RLS, and triggers before proposing changes.
3. **ALWAYS check RLS before backend changes.** A new column or table without RLS is a security hole.
4. **Check for known issues.** See the "Known Issues & Notes" section in `architecture.md` — there are active limitations (e.g., variable product stock deduction, missing `inventory_logs` INSERT policy).
