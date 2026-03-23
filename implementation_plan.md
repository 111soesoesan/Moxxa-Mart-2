# Unified Messaging Adapter (UMA) - Storefront Personalization

This plan addresses the persistence and visibility of the Web Chat widget for customers, ensuring each shop has a unique and consistent chat history.

## 1. Storefront Integration & Visibility

### Layout Integration
- **Shop Layout**: Add the [WebChatWidget](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/storefront/WebChatWidget.tsx#40-291) to `src/app/(customer)/shop/[slug]/layout.tsx`.
- **Conditional Rendering**: The widget must call `GET /api/webchat` on mount to check the `is_active` status for the specific shop. If disabled, the widget should return `null`.

---

## 2. Conversation Persistence & History

### Webchat API Enhancement
#### [MODIFY] [route.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/app/api/webchat/route.ts)
- **GET Request**:
    - Extend to accept `session_id`.
    - If a matching `messaging_conversations` record exists for the `session_id` + `shop_slug`, return:
        - `conversation_id`
        - `customer_name`
        - `history` (The last 20 messages from `messaging_messages`).

### Widget Logic (Consistent Chat)
#### [MODIFY] [WebChatWidget.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/storefront/WebChatWidget.tsx)
- **Hybrid Persistence**:
    - **Local State**: Store the `session_id` and `customer_name` in `localStorage` keyed by `shop_slug`.
    - **History Sync**: On initialization, if a `session_id` exists, fetch the conversation history from the API and populate the `messages` state.
    - **Local Cache**: For instant loading, optionally cache the last 5 messages in `localStorage` to show while waitng for the server-response.
- **Real-time Sync**: Ensure the Supabase Realtime subscription uses the `conversation_id` returned from the initial history fetch.

---

## 3. UI Refinements
- **Badge/Status**: Show a "Connecting..." status in the widget header while history is fetching.
- **Auto-scroll**: Ensure the widget always scrolls to the most recent message upon history load or new message receipt.

## Verification Plan
1. **Per-Shop Consistency**: Chat in Shop A -> verify messages are saved -> navigate to Shop B -> verify Shop B is empty -> return to Shop A -> verify messages reappear.
2. **Toggle Visibility**: Disable Web Chat in Shop A settings -> verify widget disappears from storefront -> re-enable -> verify widget and history return.
3. **Real-time Feed**: Test message delivery from vendor to customer and ensure history persists across refreshing the browser.
