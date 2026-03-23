# Moxxa Mart — Supabase Development Guidelines

This document outlines the standards and procedures for managing the Supabase infrastructure. Adhering to these guidelines ensures data security (via RLS), performance, and maintainability.

## 1. Schema & Table Standards

### Shop-Level Isolation
- **Mandatory**: Every table containing vendor or customer data MUST have a `shop_id UUID` column.
- **Foreign Keys**: Always include `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate to prevent orphaned records.
- **Indexes**: Create indexes on `shop_id` for all filtered tables to ensure performant RLS and application queries.

### Naming Conventions
- Prefer `snake_case` for tables, columns, and functions.
- Trigger names should prefix with `trg_` (e.g., `trg_update_inventory`).
- Timestamp columns should always include `created_at` and `updated_at`.

---

## 2. Row Level Security (RLS)

### Principles
- **Deny by Default**: Always `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- **Shop Ownership**: Use the standard ownership check:
  ```sql
  EXISTS (SELECT 1 FROM public.shops WHERE id = shop_id AND owner_id = auth.uid())
  ```
- **Service Role**: Explicitly allow `auth.role() = 'service_role'` for Edge Functions or backend actions where app-level bypass is intended.

### Admin Role
- Use the `public.is_admin()` function to grant full CRUD access to the 'admin' profile role.

---

## 3. Triggers & Functions

### Performance
- Use `AFTER` triggers for non-blocking stats updates (e.g., customer total spent).
- Use `BEFORE` triggers for field modifications (e.g., stamping `updated_at`).
- Keep function logic concise to minimize database overhead per transaction.

### Security
- Use `SECURITY DEFINER` for functions that need to bypass RLS (e.g., trigger-based stats updates on tables the current user might not have SELECT access to).

---

## 4. Storage Buckets

- **Public Buckets**: For assets used in the storefront (product-images, chat-images).
- **Private Buckets**: For sensitive data (payment-proofs, billing-proofs).
- **Policies**: Always restrict INSERT/DELETE to `authenticated` or `service_role`.

---

## 5. Migration Workflow

1. **Local Migration**: Create a new migration file in `supabase/migrations/`.
2. **Canonical Updates**: After a migration is tested and finalized, **immediately** update the relevant files in:
   - `supabase/schemas/*.sql`
   - `supabase/policies/*.sql`
   - `supabase/triggers/*.sql`
3. **Types**: Run `supabase gen types` after schema changes to update `src/types/supabase.ts`.
