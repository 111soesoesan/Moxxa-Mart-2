# Moxxa Mart — RLS Access Control Map

Every table has Row Level Security enabled. The service role bypasses all policies (used for server-side actions and triggers). Policies below apply to `authenticated` and `anon` roles.

> **Admin Access**: A universal `"admin_all"` policy applies to all tables. Any user whose `role = 'admin'` in `profiles` is granted full CRUD privileges via the `is_admin()` helper function.

---

## profiles

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Anyone | `USING (TRUE)` — all profiles are public |
| UPDATE | Own user only | `USING (auth.uid() = id)` |
| INSERT | — | No policy (handled by `handle_new_user()` trigger via service role) |
| DELETE | — | No policy (account deletion must go through service role) |

**Note:** No profile INSERT policy exists for the client. The trigger `on_auth_user_created` (SECURITY DEFINER) creates the row automatically on signup.

---

## shops

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Public (active shops) + Own | `status = 'active' OR auth.uid() = owner_id` |
| INSERT | Authenticated owners | `auth.uid() = owner_id` |
| UPDATE | Shop owner | `auth.uid() = owner_id` |
| DELETE | Shop owner | `auth.uid() = owner_id` |

---

## products

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Public (active) + Shop owner | `is_active = TRUE OR auth.uid() = (shops.owner_id)` |
| INSERT | Shop owner | `auth.uid() = (shops.owner_id)` |
| UPDATE | Shop owner | `auth.uid() = (shops.owner_id)` |
| DELETE | Shop owner | `auth.uid() = (shops.owner_id)` |

---

## orders

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Own user | `auth.uid() = user_id` (guests: no access via client) |
| INSERT | Anyone | `WITH CHECK (TRUE)` — supports guest checkout |
| UPDATE | Own user | `auth.uid() = user_id` |
| DELETE | — | No policy |

**Note:** Guest orders (`user_id = NULL`) are not readable via RLS. Server-side actions use the service role to fetch them.

---

## billing_proofs

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | `auth.uid() = shops.owner_id` |
| INSERT | Shop owner | `auth.uid() = shops.owner_id` |
| UPDATE | — | No policy |
| DELETE | — | No policy |

---

## payment_methods

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | `auth.uid() = shops.owner_id` |
| INSERT | Shop owner | `auth.uid() = shops.owner_id` |
| UPDATE | Shop owner | `auth.uid() = shops.owner_id` |
| DELETE | Shop owner | `auth.uid() = shops.owner_id` |

**Note:** The customer-facing checkout reads payment methods via the service role (server action), since customers do not own the shop.

---

## shop_blogs

| Operation | Who Can | Rule |
|---|---|---|
| SELECT (published) | Anyone | `published = TRUE` |
| SELECT (all) | Shop owner | `auth.uid() IN (shops.owner_id)` — sees drafts too |
| INSERT | Shop owner | `auth.uid() IN (shops.owner_id)` |
| UPDATE | Shop owner | `auth.uid() IN (shops.owner_id)` |
| DELETE | Shop owner | `auth.uid() IN (shops.owner_id)` |

---

## blog_likes

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Anyone | `USING (TRUE)` |
| INSERT | Authenticated user | `auth.uid() = user_id` |
| DELETE | Own user | `auth.uid() = user_id` |

---

## blog_comments

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Anyone | `USING (TRUE)` |
| INSERT | Authenticated user | `auth.uid() = author_id` |
| DELETE | Own user | `auth.uid() = author_id` |

---

## blog_shares

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Anyone | `USING (TRUE)` |
| INSERT | Anyone (incl. guests) | `WITH CHECK (TRUE)` |

---

## inventory

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | via `shops.owner_id = auth.uid()` |
| INSERT | Shop owner | via `shops.owner_id = auth.uid()` |
| UPDATE | Shop owner | via `shops.owner_id = auth.uid()` |
| DELETE | — | No policy (handled by CASCADE from products) |

**Note:** Auto-create triggers run as SECURITY DEFINER (bypass RLS), so inventory rows are always created on product/variation insert regardless of caller role.

---

## inventory_logs

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | via `inventory → shops → owner_id` chain |
| INSERT | — | No client policy; inserts done by SECURITY DEFINER trigger functions |

---

## customers

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | `shops.owner_id = auth.uid()` |
| INSERT | Anyone | `WITH CHECK (TRUE)` — allows service role + trigger inserts from order flow |
| UPDATE | Shop owner | `shops.owner_id = auth.uid()` |
| DELETE | — | No policy (CASCADE from shops handles cleanup) |

---

## customer_activity

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | via `customers → shops → owner_id` chain |
| INSERT | Anyone | `WITH CHECK (TRUE)` — allows automation |

---

## categories

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner OR any active shop customer | `owner_id = auth.uid() OR status = 'active'` |
| INSERT | Shop owner | `owner_id = auth.uid()` |
| UPDATE | Shop owner | `owner_id = auth.uid()` |
| DELETE | Shop owner | `owner_id = auth.uid()` |

---

## attributes

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | `shops.owner_id = auth.uid()` |
| INSERT | Shop owner | `shops.owner_id = auth.uid()` |
| UPDATE | Shop owner | `shops.owner_id = auth.uid()` |
| DELETE | Shop owner | `shops.owner_id = auth.uid()` |

---

## attribute_items

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner | via `attributes → shops → owner_id` |
| INSERT | Shop owner | via `attributes → shops → owner_id` |
| UPDATE | Shop owner | via `attributes → shops → owner_id` |
| DELETE | Shop owner | via `attributes → shops → owner_id` |

---

## product_categories

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner OR active product viewer | `owner_id = auth.uid() OR p.is_active = TRUE` |
| INSERT | Shop owner | `owner_id = auth.uid()` |
| DELETE | Shop owner | `owner_id = auth.uid()` |

---

## product_variations

| Operation | Who Can | Rule |
|---|---|---|
| SELECT | Shop owner OR active product viewer | `owner_id = auth.uid() OR p.is_active = TRUE` |
| INSERT | Shop owner | `owner_id = auth.uid()` |
| UPDATE | Shop owner | `owner_id = auth.uid()` |
| DELETE | Shop owner | `owner_id = auth.uid()` |

---

## Security Observations

1. **`WITH CHECK (TRUE)` policies** exist on `orders`, `customers`, and `customer_activity` inserts. These are intentional to support guest checkout and automation, but rely on the service role for actual data integrity in sensitive flows.

2. **No DELETE policies** on most tables. Deletion relies on FK CASCADE rules (e.g. deleting a shop cascades to products → inventory → logs). Direct client deletion is not supported.

3. **All trigger functions are SECURITY DEFINER** — they execute as the `postgres` role and bypass RLS. This is safe as long as the functions themselves have proper guards.
