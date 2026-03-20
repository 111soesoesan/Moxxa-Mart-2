# Moxxa Mart

A multi-vendor marketplace built with Next.js 16, Supabase, and Tailwind CSS.

## Architecture

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Auth & Database**: Supabase (hosted at `vktnmqvrpusnfewxevlb.supabase.co`)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Forms**: React Hook Form + Zod
- **Storage**: Supabase Storage (product-images, shop-assets, payment-proofs, billing-proofs, blog-images)

## Project Structure

```
src/
  actions/          # Next.js server actions (auth, shops, products, orders, blogs, inventory, customers, payment methods, admin)
  app/
    (admin)/        # Admin panel — shop approval, orders, billing
    (auth)/         # Login & signup pages
    (customer)/     # Public marketplace — homepage, shop storefronts, product pages, checkout, orders
    (vendor)/       # Vendor dashboard — shop management, products, orders, inventory, customers, blogs, billing
    api/auth/       # Supabase auth callback route
  components/
    ui/             # shadcn/ui components
    vendor/         # Vendor-specific components (InventoryAdjustmentDialog, OrderStatusActions, ShopShareCard)
  context/          # CartContext
  hooks/            # useCart, use-mobile
  lib/
    supabase/       # Supabase client (browser + server + service role + storage helpers + middleware)
    constants.ts
    utils.ts
  types/
    supabase.ts     # Auto-generated Supabase type definitions
```

## Key Features

- Multi-vendor: vendors create shops, list products, manage orders, inventory, and customers
- Customer flow: browse marketplace, search, view shop storefronts, add to cart, checkout (guest or authenticated)
- Payments: manual payment with proof upload (bank transfer / cash on delivery)
- Blogs: vendors can publish blog posts with likes, comments, and shares
- Admin panel: shop approval workflow, billing proof verification, order oversight
- Row Level Security enforced in Supabase for all tables

## Environment Variables

| Variable | Where stored | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Replit env var (shared) | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Replit env var (shared) | Public anon key (safe to expose) |
| `SUPABASE_PROJECT_ID` | Replit env var (shared) | Used for CLI commands |
| `SUPABASE_SERVICE_ROLE_KEY` | Replit Secret | Service role key — never expose client-side |

## Product Management System

Variable/simple products with full attribute + variation support:
- **Actions**: `categories.ts`, `attributes.ts`, `variations.ts`, updated `products.ts`
- **DB tables**: `categories`, `attributes`, `attribute_items`, `product_categories`, `product_variations` (all with RLS)
- **New product columns**: `product_type`, `status`, `sku`, `sale_price`, `sale_start`, `sale_end`, `main_image`, `gallery_images`
- **Pages**:
  - All Products — TanStack React Table with search, filters, bulk delete/status, row click to edit
  - Categories — CRUD with parent/child hierarchy
  - Attributes — CRUD with typed items (select/color/text), color picker
  - New/Edit Product — `ProductForm` component with tabs: General, Pricing, Inventory, Attributes, Variations
- **ProductForm** (`src/components/vendor/products/ProductForm.tsx`): tabbed form, cartesian variation generation, inline variation editing, bulk edit dialog, image upload per variation
- **Sidebar**: Products collapsible submenu using `Collapsible` from `radix-ui` (namespace pattern: `Collapsible.Root/Trigger/Content`)

## Database

Schema lives in `supabase/migrations/`. Tables: `profiles`, `shops`, `products`, `categories`, `attributes`, `attribute_items`, `product_categories`, `product_variations`, `orders`, `payment_methods`, `billing_proofs`, `shop_blogs`, `blog_likes`, `blog_comments`, `blog_shares`, `inventory`, `inventory_logs`, `customers`, `customer_activity`.

## Dev Commands

```bash
npm run dev        # Start dev server on port 5000
npm run build      # Production build
npm run db:mig     # Create new Supabase migration
npm run db:push    # Push migrations to Supabase
npm run db:types   # Regenerate TypeScript types from Supabase schema
```

## Database Architecture Docs

Extracted and normalized under `supabase/` (see also `supabase/migrations/` for the full change history):

```
supabase/
  schemas/
    tables.sql          # All CREATE TABLE definitions (final reconciled state)
    relationships.sql   # FK map + ER diagram in comments
    indexes.sql         # All indexes including partial unique indexes
    functions.sql       # All custom SQL functions with explanations
  policies/
    rls_policies.sql    # All RLS policies grouped by table
  triggers/
    triggers.sql        # All triggers with DROP/CREATE guards
  storage/
    buckets.sql         # Storage bucket definitions
    storage_policies.sql # Storage object access policies
  docs/
    architecture.md     # High-level overview, entity map, design decisions
    rls_map.md          # Table-by-table access control reference
    trigger_map.md      # Each trigger explained in plain English
    storage_map.md      # Bucket usage, access model, security notes
```

## Running on Replit

The app runs on port 5000 (`npm run dev -p 5000 -H 0.0.0.0`). The "Start application" workflow handles this automatically.
