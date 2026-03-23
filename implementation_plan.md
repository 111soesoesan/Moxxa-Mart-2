# Unified Messaging Adapter (UMA) - Consumer Model

This plan refines the UMA implementation to act as a "Consumer" of third-party platforms. Vendors should only provide their bot tokens, and the system handles all integration, delivery, and storefront visibility.

## 1. Automated Platform Handshake (Consumer Model)

### Actions & Logic
#### [MODIFY] [messaging.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/messaging.ts)
- **Automatic Webhook Registration**:
    - Update [upsertChannelSettings](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/messaging.ts#77-97) to automatically call the platform's "Set Webhook" API when a token is saved.
    - **Telegram**: Call `https://api.telegram.org/bot<token>/setWebhook?url=<webhook_url>`.
    - **Viber**: Call `https://chatapi.viber.com/pa/set_webhook` with the appropriate JSON payload.
- **Viber Outbound Delivery**: Implement the Viber-specific `send_message` logic in the [sendMessage](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/messaging.ts#159-217) action (currently only Telegram is implemented).

---

## 2. Reactive Storefront Web Chat

#### [MODIFY] [WebChatWidget.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/storefront/WebChatWidget.tsx)
- **Real-Time Visibility**: Instead of just sending messages, the widget must now *consume* them.
- Use Supabase Realtime to subscribe to the `messaging_messages` table for the current `session_id`'s `conversation_id`.
- **Toggle Usage**: The widget should only be rendered if the `webchat` channel is enabled and `is_active` for the specific shop.

---

## 3. UI Refinements (Vendor Side)

#### [MODIFY] [ChannelSettings.tsx](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/components/vendor/messaging/ChannelSettings.tsx)
- **Simplify**: Remove the "Webhook URL" display and instructions for manual registration.
- **Add**: A "Test Connection" button that validates the token and confirms webhook registration status.
- **Clarify**: Ensure the "Enable" switch clearly states it will toggle visibility on the storefront (for Web Chat) or the bot's responsiveness (for Telegram/Viber).

---

## 4. Logical Cleanup (UMA Webhook)

#### [MODIFY] [index.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/supabase/functions/uma-webhook/index.ts)
- **Security**: Validate that incoming requests truly come from the platform (e.g., checking IP ranges for Telegram or validating the Viber signature header).
- **Graceful Failures**: Ensure the webhook returns a 200 OK even if normalization fails, to prevent the platform from retrying and flooding the function.

## Verification Plan
1. **Automated Registration**: Save a Telegram token and verify via the Telegram API (`getWebhookInfo`) that the webhook was correctly set.
2. **End-to-End Viber**: Reply to a Viber message from the Omni-Inbox and verify delivery.
3. **Consumer Web Chat**: Message as a guest, receive a reply from the vendor, and verify it appears in the widget without a page reload.
