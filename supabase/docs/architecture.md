# Moxxa Mart — Database Architecture

## Overview

Moxxa Mart is a multi-vendor marketplace built on Supabase (PostgreSQL). The database lives in the `public` schema and comprises **23 tables** organized around five core domains:

1. **Identity & Shops** — Users, vendor shops, branding, and subscription state
2. **Catalogue** — Products, variations, categories, and attributes
3. **Commerce** — Orders, payment methods, billing proofs
4. **Operations** — Inventory tracking, customer CRM, blog content
5. **Unified Messaging (UMA)** — Multi-channel inbox (Telegram, Viber, Webchat)

All migrations are version-controlled under `supabase/migrations/`. The remote database is in sync with the local migration history (all 25 migrations applied as of 2026-03-24).

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
       │    │    ├─ customer_activity (1:N)
       │    │    └─ customer_identities (1:N) — Omnichannel link (email/phone/social)
       │    ├─ attributes (1:N)
       │    │    └─ attribute_items (1:N)
       │    └─ messaging_channels (1:N)      — UMA platform configs
       │         └─ messaging_conversations (1:N)
       │              └─ messaging_messages (1:N)
       └─ orders (1:N via user_id)           — authenticated customer orders
```

---

## Table Inventory (23 tables)

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
| `customer_identities` | Normalized contact points (for Omnichannel) | ✅ |
| `messaging_channels` | Platform settings (Telegram, Viber tokens) | ✅ |
| `messaging_conversations` | Unified Inbox chat threads (supports `ai_active`) | ✅ |
| `messaging_messages` | Inbound/Outbound chat logs | ✅ |
| `ai_personas` | AI assistant configuration per shop | ✅ |
| `ai_conversation_logs` | AI token usage + session tracking | ✅ |
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

### Unified Messaging Adapter (UMA)
The UMA centralizes shop-to-customer communication across Telegram, Viber, and native Web Chat. 
- **Normalized Data**: Regardless of source platform, messages are stored in `messaging_messages` with a common schema.
- **Shop Scoped**: Conversations are strictly isolated by `shop_id`.
- **Bot Consumer**: Moxxa Mart acts as a consumer; vendors provide bot tokens, and the system automates webhook registration.

### Omnichannel Customer Persistence
Customers are resolved into a single `customers` record using the `customer_identities` table.
- A customer can be linked via multiple channels (e.g., an email from an order and a Telegram ID).
- Statistics (LTV, order count) are aggregated at the parent `customers` level.

### Orders: JSONB Snapshots
Orders capture `items_snapshot` and `customer_snapshot` as JSONB. This preserves historical pricing and prevents orphaned data if products/customers are later deleted or modified.

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
| `20260313...` | Initial bootstrap: profiles, shops, products, orders. |
| `20260317...` | Inventory tracking, customer management CRM foundation. |
| `20260319...` | Variable products, variations, categories, attributes. |
| `20260322...` | Order-Inventory sync: deduct/restore variation stock. |
| `20260323000000` | Inventory Reservation: `reserved_quantity` column + atomic reservation logic. |
| `20260323010000` | Omnichannel Customers: `customer_identities` + auto-update customer stats. |
| `20260324000000` | Unified Messaging Adapter: Messaging tables + conversation update triggers. |
| `20260324020000` | Chat Storage: `chat-images` bucket for media messages. |

---

## Known Issues & Notes

1. **`inventory_logs` has no INSERT policy** — inserts happen only via SECURITY DEFINER trigger functions.
2. **Two `updated_at` functions** — `set_updated_at()` and `handle_updated_at()` are functionally identical.
3. **Consolidated Guidelines** — For project standards, see [GUIDELINES.md](../GUIDELINES.md).
consolidated in a future cleanup migration.

3. **`blog-images` bucket** — created via the Supabase dashboard; no SQL migration policy exists for it. Policies should be added if programmatic uploads are implemented.
