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
    admin/       # ShopApprovalActions (client component for approve/reject)
    dashboard/   # Vendor dashboard shell — AppSidebar, DashboardShell, HubHeader; AdminSidebar
    layout/      # Header, Footer, CartDrawer, SearchBar, CategoryNav
    shared/      # ProductCard, ShopCard, StatusBadge, ImageUpload
    shop/        # ShopHeader, PromotionBar, ShopSecondaryNav, LatestProductsSection, PromotionalBanner, ShopBlogSection
    vendor/      # OrderStatusActions (client component for status/mark-paid controls)
    ui/          # shadcn/ui components (includes sidebar.tsx)
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
- `shops` — vendor shops with status workflow (draft → pending → active); includes `profile_image_url`, `banner_image_url`, `shop_bio` (max 200 chars), `promotion_enabled`, `promotion_title`, `promotion_body`, `promotion_button_text`, `promotion_button_link`
- `products` — shop products with JSONB attributes/variants
- `orders` — customer orders with JSONB snapshots
- `billing_proofs` — vendor subscription payment evidence
- `shop_blogs` — vendor blog posts (title, body, image_urls[], category, published)
- `blog_likes` — user likes per blog (unique per user+blog)
- `blog_comments` — comments on blog posts (author, body)
- `blog_shares` — share tracking events (nullable user_id for public shares)

## Key Features

- **Customer**: Browse products/shops by category, search, cart, checkout (guest or authenticated), order tracking with payment proof upload
- **Vendor**: Shop onboarding (4-step: Identity → Contact/Fulfillment → Branding → Payment Methods), product management, blog management, billing/subscription, inspection workflow; Settings page with 4 tabs (General, Appearance, Promotions, Checkout); order list + order detail page with payment proof image viewer and inline status management
- **Admin**: Shop approval/rejection (with full product preview via service-role client), billing proof verification, platform stats, orders overview
- **Blogs**: Vendors publish posts (title, body, images, category, draft/publish). Authenticated users like, share, and comment. Engagement counts (likes, shares, comments) shown per-post and as aggregate stats in the vendor dashboard Blogs tab.

## Running

```bash
npm run dev      # Development server on port 5000
npm run build    # Production build
npm run start    # Production server on port 5000
```

## Form Pattern

All forms use the new `Field` component pattern from `src/components/ui/field.tsx`:

```tsx
<Field error={form.formState.errors.email?.message}>
  <FieldLabel required>Email</FieldLabel>
  <FieldControl>
    <Input type="email" {...form.register("email")} />
  </FieldControl>
  <FieldDescription>Helper text here.</FieldDescription>
  <FieldError />
</Field>
```

- **`Field`** — context provider with auto-generated id, error state, aria ids
- **`FieldLabel`** — `<label>` with auto `htmlFor`, optional `required` asterisk, red when error
- **`FieldControl`** — `Slot` wrapper that injects `id`, `aria-invalid`, `aria-describedby` onto its child input
- **`FieldDescription`** — muted helper text (linked via `aria-describedby`)
- **`FieldError`** — red error message (reads from context or accepts children)
- **`FieldGroup`** — responsive grid for side-by-side fields (default 2-col)

All forms use `react-hook-form` + `zodResolver` + Zod v4 schemas. `Controller` is used for `Select` and `Switch` (controlled components). Root-level errors use `form.setError("root", ...)`.

## Vendor Dashboard Layout

The vendor workspace uses shadcn's `Sidebar` component family from `src/components/ui/sidebar.tsx`.

**Component tree:**
- `DashboardShell` (client) — wraps `SidebarProvider` + `AppSidebar` + `SidebarInset`
- `AppSidebar` (client) — uses `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarRail`
- `HubHeader` (client) — simple sticky header used only on `/vendor` hub and `/vendor/onboarding` pages

**Layout hierarchy:**
```
(vendor)/layout.tsx              ← auth check only (getUser)
  vendor/page.tsx                ← hub page with HubHeader inline
  vendor/onboarding/page.tsx     ← onboarding with own header
  vendor/[shopSlug]/layout.tsx   ← fetches shops + profile → renders DashboardShell
    [shopSlug]/page.tsx          ← dashboard, products, orders, billing, settings
```

**Sidebar features:**
- Workspace switcher: shop logo + name + status dot → dropdown to switch shops or create new
- Collapsible to icon-only mode via `SidebarRail` or `SidebarTrigger` (`Ctrl+B`)
- Mobile: automatically becomes a `Sheet` drawer (handled by shadcn internally)
- Active nav item: detected via `usePathname()` with exact match for Dashboard
- User profile footer: avatar + name/email → dropdown (All Shops, My Orders, Sign out)

## Notes

- `src/proxy.ts` is the Next.js 16 middleware file (session refresh) — do not rename to middleware.ts
- Server actions in `src/actions/` handle all mutations using Supabase server client
- Cart state is stored in localStorage via the CartContext
