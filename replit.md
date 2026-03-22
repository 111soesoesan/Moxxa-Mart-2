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

## 5. Key Integrations
- **Payments**: System uses structured payment methods (stored in `payment_methods` table) and editable `payment_status` flows. Legacy `payment_info` JSONB fields have been deprecated and should not be used.
- **Product Management**: Supports variable products with attributes and variations.
- **Inventory Trigger Refactor**: Inventory deduction/restoration is symmetrically governed by transitioning between active and inactive states.

## 6. Skills & Workflows

### 6.1 Essential Dev Commands
When asked to run or test the app, use the following:
- `npm run dev`: Start the development server
- `npx supabase start`: Ensure local Supabase stack is running
- `npm run db:mig`: Create a new empty migration (or use `npx supabase migration new <name>`)
- `npm run db:push` or `npx supabase db push`: Apply migrations to the local database
- `npm run db:types`: Regenerate TypeScript types (or `npx supabase gen types typescript --local > src/types/supabase.ts`)

### 6.2 Agent Execution Workflow
1. **System Understanding**: Always review this `replit.md` file and any relevant `supabase/docs/` files before beginning a task.
2. **Feature Planning**: Draft an `implementation_plan.md` clearly outlining the proposed UI changes, backend modifications, and required database migrations. Request user review before proceeding.
3. **Supabase Backend Modification**:
   - Write raw SQL migrations.
   - Apply them using the Supabase CLI.
   - Regenerate TS types to ensure frontend sync.
   - Update `supabase/docs/` to reflect new tables, triggers, or RLS policies.
