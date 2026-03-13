# moxxa-mart2

A Next.js 16 multi-vendor e-commerce platform with Supabase, Shadcn UI, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: Tailwind CSS v4, Shadcn UI (Radix UI), Lucide React
- **Backend/DB**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Language**: TypeScript (strict)
- **Package Manager**: npm

## Running the App

The app runs via the "Start application" workflow:
```
npm run dev
```
Starts Next.js on port 5000, bound to 0.0.0.0 (required for Replit).

## Database Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run db:mig` | `npx supabase migration new <name>` | Create a new migration file |
| `npm run db:push` | `npx supabase db push` | Push migrations to remote Supabase |
| `npm run db:types` | `npx supabase gen types typescript ...` | Regenerate `src/types/supabase.ts` |

**Always run `npm run db:types` after a `db:push`** to keep TypeScript types in sync.

## Project Structure

```
src/
  app/            # Next.js App Router pages and layouts
  components/
    ui/           # Shadcn UI primitives (button, etc.)
  hooks/
    useCart.ts    # localStorage cart hook with Supabase type integration
  lib/
    supabase/
      client.ts   # Browser Supabase client (use in Client Components)
      server.ts   # Server Supabase client + service-role client (use in Server Components / Route Handlers)
      middleware.ts # Session refresh helper for proxy
    utils.ts      # cn() utility
  types/
    supabase.ts   # Auto-generated DB types (do not edit manually)
  proxy.ts        # Next.js 16 proxy (auth session refresh on every request)

supabase/
  config.toml
  migrations/
    20260313190412_remote_schema.sql  # Remote baseline (extensions/grants)
    20260313200000_baseline_schema.sql # App schema (profiles, shops, products, orders)
  seed.sql        # Local dev seed data
```

## Database Schema

### Tables
- **profiles** — Linked to `auth.users`, created automatically on signup. Supports `customer`, `vendor`, `admin` roles.
- **shops** — Multi-vendor: each vendor can own multiple shops.
- **products** — Extensible via JSONB `attributes` and `variants` columns.
- **orders** — Hybrid guest/authenticated checkout. Includes `items_snapshot` and `customer_snapshot` JSONB for historical accuracy, and `payment_proof_url` for manual bank/wallet verification.

### RLS Policies
- Profiles: public read, owner-only write
- Shops: public read (active only), owner-only mutate
- Products: public read (active only), shop-owner mutate
- Orders: user sees own orders; guest orders handled server-side via service role

## Supabase Clients

```ts
// Client Components
import { createClient } from "@/lib/supabase/client";

// Server Components / Route Handlers
import { createClient, createServiceClient } from "@/lib/supabase/server";
```

## Cart Hook

```ts
import { useCart } from "@/hooks/useCart";

const { cart, itemCount, subtotal, addItem, removeItem, clearCart, toOrderSnapshot } = useCart();
```

- Persists to `localStorage` under `moxxa_cart`
- Enforces single-shop constraint (clears cart if shop changes)
- `toOrderSnapshot()` returns the `items_snapshot` payload ready for the `orders` table

## Environment Variables

All Supabase credentials are configured as shared env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

## Key Configuration

- **Port**: 5000 with `0.0.0.0` binding (Replit requirement)
- **Proxy**: `src/proxy.ts` runs auth session refresh on every request (Next.js 16 convention)
- **Cross-origin**: `allowedDevOrigins` set in `next.config.ts` for Replit preview
