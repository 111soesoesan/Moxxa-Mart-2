# Skill: Supabase Backend

> Load this skill BEFORE modifying any database objects. Follow every rule.

---

## Migration Rules

| Rule | Why |
|---|---|
| **Always use migrations** | Never edit the database directly. All changes go through `supabase/migrations/`. |
| **Each migration must be atomic** | One logical change per file. It should be safe to apply or skip independently. |
| **Each migration must be reversible** | Write changes that can be undone (DROP what you CREATE, remove what you ADD). |
| **Never modify past migrations** | Already-applied migrations are immutable history. Fix forward with a new migration. |
| **If schema is messy → suggest baseline reset** | Don't try to patch a corrupted migration history. Suggest `supabase db reset` or a new baseline. |

### Migration File Naming

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Example: `20260321140000_add_wishlist_table.sql`

---

## Schema Change Locations

When modifying tables, also update the corresponding extracted schema file for documentation:

| Change Type | Schema File |
|---|---|
| Tables (CREATE, ALTER) | `/supabase/schemas/tables.sql` |
| Foreign Keys, Constraints | `/supabase/schemas/relationships.sql` |
| Indexes | `/supabase/schemas/indexes.sql` |
| Functions, Triggers | `/supabase/schemas/functions.sql` |

Also update the relevant doc if the change affects architecture, RLS, or triggers:

| Doc | When to Update |
|---|---|
| `/supabase/docs/architecture.md` | New tables, changed relationships, design decisions |
| `/supabase/docs/rls_map.md` | New or changed RLS policies |
| `/supabase/docs/trigger_map.md` | New or changed triggers |

---

## RLS Rules

1. **Always enable RLS on new tables.** No exceptions.
   ```sql
   ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Define policies for every operation the client needs.** If the client doesn't need direct access, document why and note that service role is used.

3. **Use `auth.uid()` consistently.** Match against `owner_id` or traverse FK chains to reach the owner.

4. **Follow existing patterns.** Check `/supabase/docs/rls_map.md` for the established conventions:
   - Owner-only: `auth.uid() = owner_id` or via FK join
   - Public read: `USING (TRUE)` or status-gated (`is_active = TRUE`, `published = TRUE`)
   - Guest-safe inserts: `WITH CHECK (TRUE)` (only for orders, customers, activity)

5. **Test policies.** After adding RLS, verify that:
   - The owner can access their data
   - Other users cannot access it
   - Public data is readable without auth

---

## Trigger Rules

1. **Avoid unnecessary triggers.** Only use triggers for operations that MUST happen atomically with the triggering event (e.g., auto-create inventory on product insert).

2. **Keep logic minimal and deterministic.** A trigger should do one thing predictably. Complex branching logic belongs in callable functions.

3. **Use SECURITY DEFINER carefully.**
   - Required when the trigger needs to write to tables the calling user can't access (e.g., `inventory_logs`)
   - Always set `SECURITY DEFINER` on the function, not the trigger
   - Validate inputs inside the function — SECURITY DEFINER bypasses RLS

4. **Document side effects.** Every trigger must be added to `/supabase/docs/trigger_map.md` with: table, event, function, what it does, and side effects.

5. **Check for trigger chains.** Your new trigger might fire another trigger. Trace the full chain:
   - Example: INSERT product → `auto_create_inventory` → INSERT inventory → `inventory_update_timestamp`

---

## Safety Checks (MANDATORY)

**Before applying ANY migration, verify all three:**

### 1. Check Existing Schema
```bash
# Pull current remote schema
supabase db pull

# Or inspect locally
supabase db dump
```
Read `/supabase/schemas/tables.sql` to understand current column definitions.

### 2. Check RLS Conflicts
- Read `/supabase/docs/rls_map.md`
- Will your new policies overlap or contradict existing ones?
- Are you adding a permissive policy to a table that should be restrictive?

### 3. Check Trigger Side Effects
- Read `/supabase/docs/trigger_map.md`
- Will your schema change break an existing trigger? (e.g., renaming a column that a trigger references)
- Will your new trigger conflict with existing ones on the same table/event?

---

## Drift Handling

If you detect a mismatch between migrations and the live database:

**Do NOT guess. Do NOT write a "fix" migration blindly.**

Instead, suggest one of:

| Option | When to Use |
|---|---|
| `supabase db pull` | Minor drift — pull the current remote schema and compare |
| `supabase db reset` | Development only — resets local DB and replays all migrations |
| New baseline migration | Major drift — create a fresh snapshot of the current schema as migration 0 |

Always explain the drift to the user before taking action.

---

## Quick Reference: Common Operations

### Add a column
```sql
ALTER TABLE public.products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
```
→ Update `tables.sql` + check if RLS policies need adjustment.

### Create a new table
```sql
CREATE TABLE public.wishlists ( ... );
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON public.wishlists ...;
```
→ Update `tables.sql`, `relationships.sql`, `rls_map.md`, `architecture.md`.

### Add a trigger
```sql
CREATE OR REPLACE FUNCTION public.my_function() RETURNS TRIGGER ...;
CREATE TRIGGER my_trigger AFTER INSERT ON public.my_table ...;
```
→ Update `functions.sql`, `trigger_map.md`.
