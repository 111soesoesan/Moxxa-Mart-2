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
- `/orders` — account orders (when signed in) + guest order lookup by phone
- Vendor customers list — Channel badges + phone search
- Vendor customer detail — Connected Channels card + Order History card + Activity Timeline

### Passing Channel Info
When creating an order from a non-web channel, pass `platform` and `platformId` in the `GuestInfo`:
```ts
createOrder({ ..., customer: { full_name, phone, platform: "whatsapp", platformId: "+6591234567" } })
```

## 6. AI Customer Support & Persona Engine (migration 20260325010000)

### Architecture
Vendors configure a customized AI assistant per shop powered by **Gemini 2.5 Flash** via the Vercel AI SDK (`@ai-sdk/google`). The chat widget appears on the storefront automatically when a persona is active.

- **`ai_personas`**: One row per shop (UNIQUE on `shop_id`). Stores `name`, `description_template`, `system_prompt`, `greeting_message`, `temperature`, `top_p`, `is_active`.
- **`ai_conversation_logs`**: Per-session usage tracking (`messages_count`, `tokens_input`, `tokens_output`).
- **API route**: `POST /api/chat/[shopSlug]` — Vercel AI SDK `streamText` with tool-calling (`maxSteps: 5`).
- **Secret**: `GEMINI_API_KEY` (already set). Model: `gemini-2.5-flash`.

### System Prompt Assembly
The route merges three layers in order:
1. Base personality from `description_template` (`professional|friendly|streetwear|tech|luxury`)
2. Core Moxxa Mart rules (currency, scope to own products, no fabrication)
3. Vendor's `system_prompt` ("Extra Instructions")

### Tools Available to the AI
| Tool | Purpose |
|------|---------|
| `search_products` | Keyword/category search across the shop's active products |
| `get_product_details` | Full variation tree (sizes, colors, stock, image overrides) for a single product |
| `check_discounts` | Lists products with active `sale_price` |
| `take_order` | 3-step order flow: `collect_info → confirm → submit` (creates order + customer record) |

### Storefront Rendering
`src/app/(customer)/shop/[slug]/layout.tsx` fetches the active persona server-side and conditionally renders `AIChatWidget`. If a webchat channel is also active, webchat takes priority over the AI widget.

### Vendor Config UI
`/vendor/[shopSlug]/ai-assistant` — full persona configuration page with personality templates, greeting message, extra instructions, temperature/top-p sliders, live/inactive toggle, and usage stats.

## 7. Unified Messaging Adapter (UMA)

### Architecture
A cross-platform messaging layer that aggregates Telegram, Viber, and Web Chat into a single Omni-Inbox per shop.

- **`messaging_channels`**: Per-shop platform configs (`shop_id`, `platform`, `config` JSONB, `is_active`). One row per shop per platform.
- **`messaging_conversations`**: Unified thread management linked to a `channel_id` and optionally a `customer_id`.
- **`messaging_messages`**: Normalized message records (`direction: inbound|outbound`, `content_type: text|image|file|sticker`).
- **RLS**: All three tables enforce shop owner isolation via the `shops.owner_id = auth.uid()` pattern.
- **Realtime**: Both `messaging_conversations` and `messaging_messages` are added to `supabase_realtime` publication for live inbox updates.

### Trigger
- `trg_update_conversation_on_message_insert` — auto-updates `last_message_at`, `last_message_preview`, and `unread_count` on every new message insert.

### Edge Function
- `uma-webhook` (deployed, no JWT verify): Accepts `?platform=telegram|viber|webchat&channel_id=<uuid>`. Normalizes platform payloads, resolves/creates customers via `customer_identities`, upserts conversations, and inserts messages.
- **Security**: Validates `X-Telegram-Bot-Api-Secret-Token` header against `config.webhook_secret` (auto-generated at registration). Validates `X-Viber-Content-Signature` header via HMAC-SHA256(rawBody, auth_token). Invalid requests are silently dropped with a 200 OK to prevent platform retries.
- **Graceful failures**: All error paths return 200 OK (never 4xx/5xx) to prevent Telegram/Viber from disabling the webhook on transient failures.

### Server Actions (`src/actions/messaging.ts`)
- `getShopChannels(shopId)` — fetch all channel configs for a shop
- `upsertChannelSettings(shopId, platform, config, isActive)` — save config **and** auto-register webhook with Telegram (`setWebhook` + `secret_token`) or Viber (`set_webhook`). Deregisters webhook when `isActive = false`. Returns `{ webhookStatus }` message.
- `testChannelConnection(shopId, platform)` — validates token (Telegram: `getMe` + `getWebhookInfo`, Viber: `get_account_info`, WebChat: active status check)
- `getConversations(shopId, options)` — list conversations with platform/status filters
- `getMessages(conversationId, limit)` — get messages in a conversation
- `sendMessage(conversationId, content)` — insert outbound message + dispatch to Telegram (`sendMessage`) or Viber (`send_message`) API
- `markConversationRead(conversationId)` — reset unread count
- `updateConversationStatus(conversationId, status)` — open/resolved/archived

### UI
- `/vendor/[shopSlug]/messages` — Tabbed page: **Inbox** (OmniInbox) + **Channels** (ChannelSettings)
- `OmniInbox.tsx` — Conversation list (with platform/status filters) + chat panel with real-time subscriptions
- `ChannelSettings.tsx` — Per-platform config cards (Telegram Bot, Viber Bot, Web Chat widget)
- `WebChatWidget.tsx` — Floating chat bubble for customer storefronts
- `/api/webchat` — Next.js route handler that accepts web chat messages and inserts them via service client

### Passing Web Chat Messages
POST to `/api/webchat`:
```json
{ "shop_slug": "my-shop", "session_id": "<uuid>", "sender_name": "Guest", "content": "Hello!" }
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

## 7. Smart POS System (migration 20260325000000)

### Overview
A full-screen Point of Sale terminal at `/vendor/[shopSlug]/pos` for in-store sales.

### Route & Navigation
- **URL**: `/vendor/[shopSlug]/pos`
- **Sidebar**: "POS Terminal" link with Calculator icon, above Products in the Workspace group
- **Breadcrumb**: "POS Terminal" (added to SEGMENT_LABELS in DashboardShell)

### Files
- `src/app/(vendor)/vendor/[shopSlug]/pos/page.tsx` — Server component; prefetches products, categories, payment methods
- `src/actions/pos.ts` — Server actions: `getPOSProducts`, `searchPOSCustomers`, `quickAddPOSCustomer`, `createPOSOrder`
- `src/components/pos/POSTerminal.tsx` — Client orchestrator; three-pane desktop / tab mobile layout
- `src/components/pos/usePOSCart.ts` — Cart state hook with localStorage-backed cart suspension
- `src/components/pos/POSCategoryFilter.tsx` — Left category sidebar with item counts
- `src/components/pos/POSProductGrid.tsx` — Middle product grid with search and variation picker dialog
- `src/components/pos/POSCartPanel.tsx` — Right checkout panel (items, discounts, customer, payment, charge)
- `src/components/pos/POSCustomerSearch.tsx` — Dialog: omnichannel customer search + quick-add + guest mode

### Schema Changes (migration 20260325000000_pos_source_and_rls.sql)
- `orders.source` TEXT CHECK ('storefront'|'pos') DEFAULT 'storefront'
- `orders.discount_amount` NUMERIC(12,2) DEFAULT 0
- `orders.discount_note` TEXT
- RLS: `orders_select_vendor` — shop owner can SELECT own-shop orders
- RLS: `orders_update_vendor` — shop owner can UPDATE own-shop orders (payment status etc.)

### Key Features
- **Omnichannel customer resolution**: search existing, quick-add walk-in, or guest mode
- **Per-item discounts**: fixed ₱ or percentage, via popover on each line item
- **Global discount**: applied after item discounts (fixed ₱ or %)
- **Cart suspension**: park up to N carts in localStorage, resume anytime
- **Payment status toggle**: Unpaid / Pending / Paid — set at charge time
- **Variation picker**: Dialog for variable products to select a specific SKU before adding to cart
- **Inventory integration**: uses existing `try_reserve_inventory_line` RPC on order creation
