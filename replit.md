# Moxxa Mart - AI Assistant Guidelines (replit.md)

Welcome to the Moxxa Mart project. This document serves as the primary system context, architecture reference, and rulebook for AI assistants working in this workspace.

## 1. Project Overview
Moxxa Mart is a multi-vendor marketplace platform. Vendors can create shops, list variable/simple products, manage inventory and orders, and publish blogs. Customers can browse, cart items, and checkout (guest or authenticated). Admins oversee shop approvals and billing.

## 2. Architecture & Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Backend & Auth**: Supabase (PostgreSQL, updatable via CLI migrations)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Forms & Validation**: React Hook Form + Zod
- **Storage**: Supabase Storage (product-images, shop-assets, payment-proofs, billing-proofs, blog-images)

## 3. Project Structure
```text
src/
  actions/          # Next.js server actions (auth, shops, products, orders, blogs, etc.)
  app/
    (admin)/        # Admin panel (shop approval, orders, billing)
    (auth)/         # Login & signup pages
    (customer)/     # Public marketplace (homepage, storefronts, product pages, checkout)
    (vendor)/       # Vendor dashboard (shop management, inventory, blogs)
    api/auth/       # Supabase auth callback
  components/       # UI and feature components (shadcn/ui, vendor components)
  lib/
    supabase/       # Supabase clients (browser, server, service role, middleware)
supabase/
  migrations/       # All database schema migrations
  docs/             # High-level architecture, RLS map, triggers map, storage map
```

## 4. Development Rules & Conventions

### 4.1 Data Fetching & Mutations
- **Server Actions**: Exclusively use Next.js Server Actions (in `src/actions/`) for data mutations and fetching where possible. 
- **Error Handling**: Follow established patterns returning structured `{ success, data, error }` objects from actions.

### 4.2 Security & Supabase
- **Row Level Security (RLS)**: RLS is strictly enforced for all tables. Ensure any new tables have appropriate RLS policies.
- **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed client-side. Use server-side clients or service clients securely when administrative privileges are required.

### 4.3 Database Management
- **Migrations**: All schema changes must be done via Supabase CLI migrations. Never make structural database changes without generating and applying a migration file.
- **Reference**: Consult `supabase/docs/architecture.md` and related map files before proposing schema changes to maintain normalized state.

### 4.4 UI & Styling
- **Tailwind & shadcn/ui**: Use Tailwind CSS for custom styling. Rely on existing `shadcn/ui` components located in `src/components/ui` as the primary building blocks for new interfaces.

## 5. Omnichannel Customer System (migration 20260323010000)

### Architecture
Customer identity resolution works across all channels without requiring a login:

- **`customers` table**: One row per customer per shop. May have `email`, `phone`, or both. `preferred_channel` tracks the first platform used.
- **`customer_identities` table**: Links a `customer_id` to a platform identifier (e.g. WhatsApp phone, Telegram chat ID). One row per platform per customer.
- **`getOrCreateCustomer()`** in `src/actions/customers.ts`: Unified resolution — looks up by platform identity → phone → email, backfills missing fields, and registers identities. Never generates fake guest emails.

### Resolution Priority (in `getOrCreateCustomer`)
1. Platform identity match (customer_identities table)
2. Phone match (most useful for WhatsApp/Telegram guests)
3. Email match (for web/authenticated users)
4. Create new record

### Triggers
- `trg_update_customer_stats_on_order_insert` — auto-updates `total_orders`, `total_spent`, `last_order_at`, and logs activity whenever an order is inserted.
- `trg_adjust_customer_stats_on_order_cancel` — decrements stats and logs when an order is cancelled or refunded.

### UI
- `/orders/lookup` — public phone-based order tracking page (no login required)
- Vendor customers list — Channel badges + phone search
- Vendor customer detail — Connected Channels card + Order History card + Activity Timeline

### Passing Channel Info
When creating an order from a non-web channel, pass `platform` and `platformId` in the `GuestInfo`:
```ts
createOrder({ ..., customer: { full_name, phone, platform: "whatsapp", platformId: "+6591234567" } })
```

## 6. Key Integrations
- **Payments**: System uses structured payment methods (stored in `payment_methods` table) and editable `payment_status` flows. Legacy `payment_info` JSONB fields have been deprecated and should not be used.
- **Product Management**: Supports variable products with attributes and variations.
- **Inventory Trigger Refactor**: Inventory deduction/restoration is symmetrically governed by transitioning between active and inactive states.

## 6. Replit Environment

### 6.1 Environment Variables
The following secrets/env vars are required and are configured in Replit Secrets:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (env var, shared)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (env var, shared)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret) — never expose client-side
- `SUPABASE_PROJECT_ID` — Supabase project ID (env var, shared)

### 6.2 Essential Dev Commands
When asked to run or test the app, use the following:
- `npm run dev`: Start the development server (port 5000)
- `npm run build`: Build for production

### 6.3 Agent Execution Workflow
1. **System Understanding**: Always review this `replit.md` file and any relevant `supabase/docs/` files before beginning a task.
2. **Feature Planning**: Draft an `implementation_plan.md` clearly outlining the proposed UI changes, backend modifications, and required database migrations. Request user review before proceeding.
3. **Supabase Backend Modification**:
   - Write raw SQL migrations.
   - Apply them using the Supabase CLI.
   - Regenerate TS types to ensure frontend sync.
   - Update `supabase/docs/` to reflect new tables, triggers, or RLS policies.
