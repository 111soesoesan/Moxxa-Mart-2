# Smart POS System — Visionary Retail Architecture

This document serves as the canonical technical blueprint for implementing a professional-grade, "Smart" Point of Sale (POS) system within the Moxxa Mart Vendor Hub. The goal is to provide vendors with a desktop-class retail experience that remains fully operational on mobile devices.

---

## 1. Vision & Core Objectives
- **Speed-First Design**: Minimal clicks/taps from product selection to checkout completion.
- **Omnichannel Mastery**: Seamlessly merge physical retail data with existing online customer profiles.
- **Intelligent Operations**: Automated inventory reservation/deduction and real-time statistics.
- **Premium Aesthetics**: A "wow" factor UI using shadcn/ui, responsive grids, and fluid animations.

---

## 2. Feature Roadmap & Specifications

### A. Advanced Product Browsing & Entry
- **Fuzzy Search & Barcode-Ready**: Search by partial name, SKU, or category. Native support for USB/Bluetooth barcode scanners (intercepting raw input).
- **Infinite Grid/List View**: Optimized for 1000+ items using virtualization.
- **Intelligent Variations**: Single-click variant selection for common attributes (e.g., size) with quick-switching in the cart.
- **Upsell Engine**: Dynamic "Commonly Bought Together" widget that updates as items are added to the cart.

### B. Visionary Cart Management
- **Manual Pricing & Discounts**: Ability to override unit prices on-the-fly or apply per-item %/fixed discounts.
- **Global Promotions**: Apply shop-wide discount codes or manual subtractions at the final order level.
- **Suspend & Resume**: Multiple active carts can be "parked" (saved to `localStorage` with a timestamp/name) so a vendor can serve multiple customers simultaneously.
- **Offline Persistence**: The cart state survives page refreshes and temporary network drops.

### C. Omnichannel Customer Resolution
- **Identity Linkage**: search for customers by phone/name. If found, link the POS order to their existing `public.customers` record.
- **Quick-Register**: A 2-field popup (Name + Phone) to register new walk-ins without leaving the sales flow.
- **One-Time Guest**: Standard anonymous checkout for cash-heavy, privacy-oriented sales.
- **Loyalty View**: Quick-access modal showing the selected customer's "Average Spend" and "Last 5 Purchases."

### D. Checkout & Payment Logistics
- **Flexible Payment Status**: Manual toggle for `unpaid` (tab), `pending`, or `paid` (full completion).
- **Split Payments (Visionary)**: Logic to record multiple payment methods for a single order (e.g., "50% Cash, 50% Bank Transfer") via JSONB metadata in the `orders` table.
- **Digital Receipting**: Instant PDF generation for printing, or "Send via Chat" (Viber/Telegram) if the customer is linked to a UMA identity.

---

## 3. UI/UX Architecture

### Layout Strategy
- **Desktop (Traditional POS)**: A 3-column layout:
    1. **Left (Width 15%)**: Categories & Filters.
    2. **Middle (Width 55%)**: Scrollable product grid with large tap targets.
    3. **Right (Width 30%)**: Sticky Cart & Order Summary.
- **Mobile (On-the-go)**: A 2-tab mobile view with a persistent bottom subtotal bar. Swiping between "Shop" and "Review/Checkout".

### Aesthetic Standards
- **Dark Mode Optimization**: Reduced eye strain for vendors in retail environments.
- **Micro-animations**: Use `framer-motion` for "Fly-to-Cart" animations and smooth status changes.
- **Color Palette**: High-contrast, brand-aligned professional colors (Vibrant Emerald for success, Sleek Slate for structure).

---

## 4. Technical Implementation Details

### Database Sourcing
- Introduce a `source` column ([pos](file:///Users/saiaungkham/Documents/Web%20Dev/Moxxa%20Mart/moxxa-mart2/src/types/supabase.ts#1373-1389) | `storefront`) to allow vendors to filter their sales reports by channel.
- Upgrade RLS to per-shop "Manage Orders" permission, allowing vendors to update statuses that were previously read-only for security reasons.

### State & Performance
- **React State**: Managed via `Zustand` or specialized context for global cart synchronization.
- **Prefetching**: Categories and top Products are prefetched on POS login for zero-latency browsing.

---

## 5. Verification & Quality Assurance
- **Stress Testing**: Handling 100 items in a single cart with multiple complex discounts.
- **Concurrency Test**: Confirming that adding an item to the POS cart correctly reflects stock availability in real-time.
- **Omnichannel Validation**: Ensure a customer registered in POS is immediately available for UMA (Messaging) interactions.
