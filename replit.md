# Moxxa Mart

A multi-vendor marketplace built with Next.js 16, Supabase, and Tailwind CSS / shadcn/ui.

## Architecture

- **Framework**: Next.js 16 (App Router, Turbopack) running on port 5000
- **Database & Auth**: Supabase (hosted) — PostgreSQL with Row Level Security, Supabase Auth
- **Storage**: Supabase Storage buckets (product-images, shop-assets, payment-proofs, billing-proofs)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Forms**: react-hook-form + zod validation

## Project Structure

```
src/
  actions/       # Server actions (auth, shops, products, orders, admin)
  app/
    (admin)/     # Admin dashboard - shop approval, billing management
    (auth)/      # Login & signup pages
    (customer)/  # Storefront - home, product, shop, search, checkout, orders
    (vendor)/    # Vendor dashboard - shop management, products, billing
    api/         # API routes (Supabase auth callback)
  components/
    layout/      # Header, Footer, CartDrawer, SearchBar, CategoryNav
    shared/      # ProductCard, ShopCard, StatusBadge, ImageUpload
    ui/          # shadcn/ui components
  context/       # CartContext (localStorage-based cart)
  hooks/         # useCart
  lib/
    supabase/    # client.ts, server.ts, middleware.ts, storage.ts
    utils.ts
    constants.ts
  proxy.ts       # Next.js 16 proxy/middleware (session refresh via Supabase)
  types/
    supabase.ts  # Generated Supabase TypeScript types
```

## Environment Variables

Set in `.replit` userenv:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (safe for browser)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only, bypasses RLS)
- `SUPABASE_PROJECT_ID` — Project ID for CLI commands

## Database Schema

Managed via Supabase migrations in `supabase/migrations/`:
- `profiles` — linked to auth.users, with role (customer/vendor/admin)
- `shops` — vendor shops with status workflow (draft → pending → active)
- `products` — shop products with JSONB attributes/variants
- `orders` — customer orders with JSONB snapshots
- `billing_proofs` — vendor subscription payment evidence

## Key Features

- **Customer**: Browse products/shops by category, search, cart, checkout (guest or authenticated), order tracking
- **Vendor**: Shop onboarding, product management, billing/subscription, inspection workflow
- **Admin**: Shop approval/rejection, billing proof verification

## Running

```bash
npm run dev      # Development server on port 5000
npm run build    # Production build
npm run start    # Production server on port 5000
```

## Notes

- `src/proxy.ts` is the Next.js 16 middleware file (session refresh) — do not rename to middleware.ts
- Server actions in `src/actions/` handle all mutations using Supabase server client
- Cart state is stored in localStorage via the CartContext
