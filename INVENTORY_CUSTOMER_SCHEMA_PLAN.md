# Inventory Management & Customer Management System - Schema Plan

**Created:** March 17, 2026  
**Database:** Supabase PostgreSQL  
**Migration File:** `20260317000000_inventory_customer_management.sql`

---

## Overview

This migration implements two integrated systems for the Moxxa-Mart multi-vendor marketplace:
1. **Inventory Management System** - Real-time stock tracking and management
2. **Customer Management System** - Customer relationship management and analytics

---

## Schema Design

### 1. Inventory Management Tables

#### `inventory` Table
Tracks stock levels for each product in a shop.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique inventory record identifier |
| `product_id` | UUID | UNIQUE, FK → products | Links to product |
| `shop_id` | UUID | FK → shops | Links to shop (supports multi-location future) |
| `stock_quantity` | INTEGER | NOT NULL, DEFAULT 0, ≥0 | Current available stock |
| `reserved_quantity` | INTEGER | NOT NULL, DEFAULT 0, ≤stock | Stock reserved during checkout |
| `low_stock_threshold` | INTEGER | DEFAULT 5 | Threshold for low stock alerts |
| `sku` | TEXT | NULLABLE | Stock Keeping Unit for external inventory systems |
| `last_updated_at` | TIMESTAMP | NOT NULL | Last inventory change timestamp |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp (auto-updated by trigger) |

**Indexes:**
- `product_id` - Fast product lookups
- `shop_id` - Fast shop-wide queries
- `(stock_quantity, low_stock_threshold)` - Low stock alerts

**Constraints:**
- `inventory_product_id_fkey` - Cascade delete with products
- `inventory_shop_id_fkey` - Cascade delete with shops
- `inventory_reserved_less_than_stock` - Reserved ≤ stock

---

#### `inventory_logs` Table
Audit trail for all inventory changes with complete history.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Log entry identifier |
| `inventory_id` | UUID | FK → inventory | Links to inventory record |
| `change_type` | VARCHAR(50) | ENUM (sale, manual_update, restock, cancel, reservation, return) | Type of change |
| `quantity_change` | INTEGER | NOT NULL | Amount changed (positive/negative) |
| `previous_quantity` | INTEGER | NULLABLE | Stock before change |
| `new_quantity` | INTEGER | NULLABLE | Stock after change |
| `reference_id` | UUID | NULLABLE | Order ID or related transaction |
| `notes` | TEXT | NULLABLE | Admin notes for manual adjustments |
| `created_by` | UUID | FK → profiles | User who made the change (NULL for system) |
| `created_at` | TIMESTAMP | NOT NULL | Change timestamp |

**Indexes:**
- `inventory_id` - Fast history lookups
- `reference_id` - Find all changes for an order
- `change_type` - Filter by change type
- `created_at DESC` - Recent changes first

**Use Cases:**
- Audit trail for compliance
- Revert inventory changes
- Analyze inventory patterns
- Future: AI-powered restock suggestions

---

### 2. Customer Management Tables

#### `customers` Table
Tracks customer information per shop.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Customer identifier |
| `shop_id` | UUID | FK → shops | Shop owner relationship |
| `user_id` | UUID | FK → profiles, NULLABLE | Link to registered user if available |
| `name` | VARCHAR(255) | NOT NULL | Customer full name |
| `email` | VARCHAR(255) | NULLABLE | Customer email |
| `phone` | VARCHAR(20) | NULLABLE | Customer phone number |
| `total_orders` | INTEGER | DEFAULT 0 | Total orders placed |
| `total_spent` | DECIMAL(12,2) | DEFAULT 0.00 | Lifetime customer value |
| `last_order_at` | TIMESTAMP | NULLABLE | Most recent order date |
| `first_order_at` | TIMESTAMP | NULLABLE | First purchase date |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- `shop_id` - List customers by shop
- `user_id` - Find registered user's customer records
- `email` - Quick email lookups
- `total_spent DESC` - Sort by customer value
- `last_order_at DESC` - Find recently active customers

**Constraints:**
- `customers_shop_email_unique(shop_id, email)` - One customer per email per shop
- Automatically updated by triggers on order creation

**Future Features:**
- Customer tagging (VIP, repeat buyer, inactive)
- Customer segmentation
- Lifetime value tracking
- Churn prediction

---

#### `customer_activity` Table
Tracks all interactions and activities with customers.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Activity log identifier |
| `customer_id` | UUID | FK → customers | Links to customer |
| `activity_type` | VARCHAR(50) | ENUM (order, message, visit, review, note, tag) | Type of activity |
| `reference_id` | UUID | NULLABLE | Order ID, message ID, etc. |
| `description` | TEXT | NULLABLE | Activity description |
| `metadata` | JSONB | NULLABLE | Extensible data for future features |
| `created_at` | TIMESTAMP | NOT NULL | Activity timestamp |

**Indexes:**
- `customer_id` - View customer's activity history
- `activity_type` - Filter by activity type
- `created_at DESC` - Most recent activities first

**Metadata Examples:**
```json
{
  "order_id": "uuid",
  "amount": 150.00,
  "items_count": 3,
  "tags": ["VIP", "repeat_buyer"],
  "notes": "Preferred payment method: Bank transfer"
}
```

---

### 3. Integration Changes

#### `orders` Table Enhancement
Added `customer_id` column to link orders to customers.

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `customer_id` | UUID | NULL | FK → customers |

**Workflow:**
1. Customer places order
2. System creates/links customer record
3. Updates customer stats (total_orders, total_spent)
4. Creates activity log entry

---

## Database Functions

### Inventory Functions

#### `update_inventory_on_order()`
Deducts stock when order is placed.

```sql
update_inventory_on_order(
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
```

**Actions:**
- Validates sufficient stock
- Reduces `stock_quantity`
- Creates inventory log entry
- Raises exception if insufficient stock

---

#### `restore_inventory_on_cancel()`
Restores stock when order is cancelled.

```sql
restore_inventory_on_cancel(
  p_inventory_id UUID,
  p_quantity INTEGER,
  p_order_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
```

---

#### `manual_inventory_update()`
Manual inventory adjustment by shop owners or admins.

```sql
manual_inventory_update(
  p_inventory_id UUID,
  p_new_quantity INTEGER,
  p_change_type VARCHAR,
  p_notes TEXT,
  p_user_id UUID
) RETURNS BOOLEAN
```

---

### Customer Functions

#### `update_customer_stats_on_order()`
Updates customer metrics after order placement.

```sql
update_customer_stats_on_order(
  p_customer_id UUID,
  p_order_total DECIMAL
) RETURNS BOOLEAN
```

**Updates:**
- `total_orders` - Increment by 1
- `total_spent` - Add order total
- `last_order_at` - Set to NOW()
- `first_order_at` - Set if NULL (first order)
- Creates activity log entry

---

## Row Level Security (RLS)

All tables have RLS enabled for multi-tenant security.

### Inventory RLS
- **SELECT:** Shop owners can only view their own shop's inventory
- **UPDATE:** Shop owners can only update their own shop's inventory

### Customer RLS
- **SELECT:** Shop owners can only view their own shop's customers
- **UPDATE:** Shop owners can only update their own shop's customers

### Customer Activity RLS
- **SELECT:** Shop owners can only view activity for their own customers

---

## Performance Optimizations

### Indexes Strategy
1. **Foreign Key Indexes** - Fast joins and cascade operations
2. **Query Indexes** - Common filter patterns (shop_id, product_id, status)
3. **Sorting Indexes** - Created_at DESC for chronological queries
4. **Composite Indexes** - (stock_quantity, low_stock_threshold) for alerts

### Constraints
1. **Check Constraints** - Prevent invalid states (reserved > stock)
2. **Unique Constraints** - Enforce business rules (one customer per email per shop)
3. **Foreign Key Constraints** - Maintain referential integrity

---

## Migration Execution

### Prerequisites
- Supabase project with auth.users() available
- Existing tables: `products`, `shops`, `profiles`, `orders`

### Execute Migration
```bash
supabase migration up 20260317000000_inventory_customer_management.sql
```

### Verify Migration
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('inventory', 'inventory_logs', 'customers', 'customer_activity');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%inventory%' OR routine_name LIKE '%customer%';
```

---

## TypeScript Types Generation

After migration, update TypeScript types:

```bash
supabase gen types typescript --schema public > src/types/supabase.ts
```

---

## Implementation Phases

### Phase 1: Core Implementation (Current)
- ✅ Schema and tables
- ✅ Functions and triggers
- ✅ RLS policies
- ⏳ Backend actions (inventory, customer endpoints)
- ⏳ UI components (inventory dashboard, customer list)

### Phase 2: Vendor Hub Integration
- ⏳ Inventory management dashboard
- ⏳ Manual stock adjustments
- ⏳ Inventory history viewer
- ⏳ Low stock alerts

### Phase 3: Customer Management
- ⏳ Customer list dashboard
- ⏳ Customer detail views
- ⏳ Order history per customer
- ⏳ Customer activity timeline

### Phase 4: Advanced Features
- ⏳ Bulk inventory import/export
- ⏳ Customer tagging and segmentation
- ⏳ AI-powered insights
- ⏳ Predictive analytics

---

## Data Relationships

```
shops
  ├── products
  │   └── inventory
  │       ├── inventory_logs
  │       └── orders (via product_id in snapshot)
  └── customers
      ├── customer_activity
      └── orders (via customer_id)

profiles
  ├── shops (owner_id)
  ├── inventory_logs (created_by)
  └── customers (user_id, optional)
```

---

## Future Enhancements

### Inventory
1. **Variants Support** - Track inventory per variant (size, color)
2. **Multi-Location** - Support multiple warehouse locations
3. **Reservations** - Formal reservation system during checkout
4. **Forecasting** - Predict demand and suggest restocks
5. **Supplier Integration** - Auto-create purchase orders

### Customer
1. **Tagging System** - VIP, repeat buyer, inactive, etc.
2. **Segmentation** - Group customers by behavior/value
3. **Chat Integration** - Link to customer messages
4. **Review Integration** - Track product reviews per customer
5. **Email Campaigns** - Marketing automation hooks

---

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for UTC consistency
- IDs use UUID for distributed system readiness
- JSONB metadata columns for extensibility without schema changes
- Functions use `plpgsql` for transactional safety
- Triggers auto-update `updated_at` timestamps
- RLS leverages auth.uid() for security

---

## Contact

For schema questions or updates, refer to the inventory/customer management feature documentation.
