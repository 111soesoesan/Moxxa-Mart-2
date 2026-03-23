# Unified Messaging Adapter (UMA)

This plan implements a centralized messaging system that aggregates Web Chat, Telegram, and Viber into a single Omni-Inbox for vendors.

## 1. UI & Logic Allocation

### Vendor Hub Integration
- **Sidebar**: Add a "Messages" item to the [AppSidebar.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/dashboard/AppSidebar.tsx) navigation (under `OTHER_NAV_ITEMS`) using the `MessageSquare` icon.
- **Shop Scoped Routing**: All messaging features are located under `/vendor/[shopSlug]/messages`. This ensures strict logical isolation between different shops owned by the same vendor.
- **Feature Interface**: Use a tabbed interface at the top of the messages page:
    - **Inbox Tab**: The primary Omni-Inbox (Conversation list + Active chat).
    - **Channels Tab**: Management of messaging providers (Telegram Bot, Viber Bot, Web Chat settings).
- **Sub-Navigation**: Within the Inbox, use a dropdown or icon-bar to filter by specific channel (e.g., "See only Telegram messages").

---

## 2. Database Schema (Supabase)

#### [NEW] [20260324000000_uma_messaging_system.sql](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/supabase/migrations/20260324000000_uma_messaging_system.sql) [NEW]
- **`messaging_channels`**: Store per-shop platform configs (`shop_id` FK).
- **`messaging_conversations`**: Unified thread management (`shop_id` context via channel).
- **`messaging_messages`**: Normalized message records.
- **RLS Policies**: Enforce `shop_id` isolation. Vendors can only access messaging data linked to shops they own.

---

## 3. Messaging Pipelines

### Inbound (Edge Functions)
#### [NEW] [uma-webhook/index.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/supabase/functions/uma-webhook/index.ts) [NEW]
- **Identity Resolution**: Links messages to existing `customers` via `customer_identities`.
- **Normalization**: Supports Telegram, Viber, and Web Chat payloads.

### Outbound (Server Actions)
#### [NEW] [messaging.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/messaging.ts) [NEW]
- `sendMessage(conversationId, content)`: Dispatches to the correct third-party API.
- `updateChannelSettings(shopId, platform, settings)`: Managed via the "Channels" tab.

---

## 4. Components

#### [NEW] [OmniInbox.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/vendor/messaging/OmniInbox.tsx) [NEW]
#### [NEW] [ChannelSettings.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/vendor/messaging/ChannelSettings.tsx) [NEW]
#### [NEW] [WebChatWidget.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/storefront/WebChatWidget.tsx) [NEW]

## Verification Plan
1. **Multi-Shop Isolation**: Create two shops and verify that Telegram messages sent to Shop A's bot do not appear in Shop B's inbox.
2. **Tabbed Navigation**: Verify smooth switching between the Inbox and Channel Settings without full page reloads.
