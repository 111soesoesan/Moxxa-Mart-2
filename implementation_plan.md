# Omnichannel Customer Feature Completion

This plan implements a unified identity resolution system to ensure consistent customer data across all interfaces (Web, WhatsApp, Telegram, etc.).

## Proposed Changes

### Database Layer

#### [NEW] [20260323010000_omnichannel_customers.sql](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/supabase/migrations/20260323010000_omnichannel_customers.sql) [NEW]
- **`customer_identities` Table**: Stores linkages between a `customer_id` and platform IDs (e.g., WhatsApp Phone, Telegram ID, Messenger ID).
- **`customers` Table Update**:
    - Ensure `email` and `phone` are both usable as identifiers.
    - Soften unique constraints to allow identity merging (e.g., linking a phone to an existing email profile).
    - Add `preferred_channel` for targeted notifications.

### Actions & Logic

#### [MODIFY] [customers.ts](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/customers.ts)
- **Unified Identity Resolution**: 
    - Rewrite [getOrCreateCustomer](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/actions/customers.ts#282-319) to check both email and phone.
    - Check the new `customer_identities` table for platform-specific matches.
    - Automatically merge profiles if a customer identifier is shared (e.g., a Telegram user providing an email that already exists in the shop).

### User Interface

#### [MODIFY] [Order Lookup / Dashboard]
- **Phone-Based Lookup**: Create a simplified order lookup page accessible via phone number for guest and chat-based users.
- **Unified Order History**: Ensure the "My Orders" view displays orders placed via any channel (Web, WhatsApp, etc.) if the identities are linked.
- **Vendor View**: Update the customer detail page in the vendor dashboard to show all connected channels and a unified activity timeline.

## Verification Plan

### Manual Verification
- **Identity Merging**: Simulate a guest order via WhatsApp (phone-only) and then a web checkout with the same phone; verify they are linked to the same customer record.
- **Cross-Platform History**: Verify that orders placed via simulated "Chat IDs" appear in the unified order history lookup.
- **Omnichannel Profile**: Verify that `total_spent` and `total_orders` correctly aggregate across all channels.
