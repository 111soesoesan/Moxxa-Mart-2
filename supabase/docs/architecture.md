# Moxxa Mart — Database Architecture

## Overview

Moxxa Mart is a multi-vendor marketplace built on Supabase (PostgreSQL). The database lives in the `public` schema and comprises **19 tables** organized around four core domains:

1. **Identity & Shops** — Users, vendor shops, branding, and subscription state
2. **Catalogue** — Products, variations, categories, and attributes
3. **Commerce** — Orders, payment methods, billing proofs
4. **Operations** — Inventory tracking, customer CRM, blog content

All migrations are version-controlled under `supabase/migrations/`. The remote database is in sync with the local migration history (all 14 migrations applied as of 2026-03-20).

---

## Core Entities & Relationships

```
auth.users (Supabase managed)
  └─ profiles (1:1)                         — user display info + role
       ├─ shops (1:N)                        — vendor storefronts
       │    ├─ products (1:N)
       │    │    ├─ product_variations (1:N) — per-SKU rows for variable products
       │    │    │    └─ inventory (1:1)     — variation-level stock row
       │    │    ├─ inventory (1:1)          — simple product stock row
       │    │    │    └─ inventory_logs (1:N)
       │    │    └─ product_categories (M:N) ─── categories (1:N, hierarchical)
       │    ├─ payment_methods (1:N)
       │    ├─ orders (1:N)
       │    ├─ shop_blogs (1:N)
       │    │    ├─ blog_likes (1:N)
       │    │    ├─ blog_comments (1:N)
       │    │    └─ blog_shares (1:N)
       │    ├─ billing_proofs (1:N)
       │    ├─ customers (1:N)               — per-shop CRM records
       │    │    └─ customer_activity (1:N)
       │    └─ attributes (1:N)
       │         └─ attribute_items (1:N)
       └─ orders (1:N via user_id)           — authenticated customer orders
```

---

## Table Inventory (19 tables)

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | User display name, avatar, role | ✅ |
| `shops` | Vendor storefronts with status lifecycle | ✅ |
| `products` | Simple & variable products | ✅ |
| `product_variations` | Per-SKU rows for variable products | ✅ |
| `categories` | Shop-scoped hierarchical product categories | ✅ |
| `attributes` | Product attribute definitions (color, size…) | ✅ |
| `attribute_items` | Possible values for each attribute | ✅ |
| `product_categories` | Product ↔ Category junction | ✅ |
| `orders` | Customer orders with JSONB snapshots | ✅ |
| `payment_methods` | Shop payment options (cash/bank) | ✅ |
| `billing_proofs` | Vendor subscription payment uploads | ✅ |
| `inventory` | Stock rows (1 per simple product or variation) | ✅ |
| `inventory_logs` | Audit trail for all stock changes | ✅ |
| `customers` | Per-shop customer CRM records | ✅ |
| `customer_activity` | Customer interaction log | ✅ |
| `shop_blogs` | Vendor blog posts | ✅ |
| `blog_likes` | Blog like records | ✅ |
| `blog_comments` | Blog comment records | ✅ |
| `blog_shares` | Blog share records | ✅ |

---

## Key Design Decisions

### Inventory: Variation-level tracking
The `inventory` table uses **partial unique indexes** to support two distinct row types:
- **Simple products**: one row where `variation_id IS NULL`, unique on `product_id`
- **Variable products**: one row per variation where `variation_id IS NOT NULL`, unique on `variation_id`

Parent-level inventory rows for variable products do not exist. When a variation's `inventory.stock_quantity` is updated, a trigger keeps `product_variations.stock_quantity` in sync.

### Orders: JSONB Snapshots
Orders capture `items_snapshot` (product name, price, qty at order time) and `customer_snapshot` (delivery address, contact) as JSONB. This preserves historical pricing and prevents orphaned data if products are later deleted.

### Shops: Status Lifecycle
Shops follow a lifecycle: `draft → pending → active | rejected | suspended`. Only `active` shops are visible to the public. Owners always see their own shops regardless of status.

### Products: Dual Visibility
Products are visible publicly if `is_active = TRUE`, or privately if the requesting user owns the shop. This allows vendors to manage drafts without exposing them to customers.

### Guest Checkout
Orders support `user_id = NULL` for guest checkouts. Guest order data is accessed server-side via the service role key; RLS does not expose guest orders to unauthenticated clients.

---

## Extensions Used

| Extension | Schema | Purpose |
|---|---|---|
| `pg_graphql` | graphql | Auto-generated GraphQL API |
| `pg_stat_statements` | extensions | Query performance monitoring |
| `pgcrypto` | extensions | `gen_random_uuid()` |
| `supabase_vault` | vault | Secret management |
| `uuid-ossp` | extensions | UUID utilities |

---

## Migration History

| Migration | Description |
|---|---|
| `20260313190412` | Remote schema bootstrap (extensions, grants) |
| `20260313200000` | Baseline: profiles, shops, products, orders, RLS, updated_at |
| `20260313210000` | Extended shops/products, billing_proofs, storage buckets |
| `20260315000000` | Payment methods system + auto-create Cash on Delivery trigger |
| `20260315101500` | Fix: corrected trigger to insert into payment_methods (not payments) |
| `20260315120000` | Blog tables: shop_blogs, blog_likes, blog_comments, blog_shares |
| `20260316000000` | Shop branding: profile_image, banner, promotions, shop_bio |
| `20260317000000` | Inventory + customer management tables, callable functions |
| `20260317100000` | Inventory RLS INSERT policies + auto-create inventory trigger |
| `20260317110000` | Added `track_inventory` flag to products |
| `20260318000000` | Trigger: deduct stock on order confirmation |
| `20260318100000` | Trigger: restore stock on order cancellation |
| `20260319000000` | Product management: product_type, variations, categories, attributes |
| `20260319120000` | Variation-level inventory: variation_id FK, partial indexes, sync trigger |
| `20260322120000` | Order triggers: deduct/restore variation stock when `items_snapshot.variation_id` is set |
| `20260323000000` | `product_variations.track_inventory`; `try_reserve_inventory_line` / `release_inventory_reservation_line`; confirm deducts reserved + stock; pending cancel releases reserved |

---

## Known Issues & Notes

1. **`inventory_logs` has no INSERT policy** — inserts happen only via SECURITY DEFINER trigger functions or the service role. If direct client inserts are ever needed, an explicit policy must be added.

2. **Two `updated_at` functions** — `set_updated_at()` and `handle_updated_at()` are functionally identical. They can be consolidated in a future cleanup migration.

3. **`blog-images` bucket** — created via the Supabase dashboard; no SQL migration policy exists for it. Policies should be added if programmatic uploads are implemented.
