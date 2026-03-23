# Skill: Feature Planning

> Load this skill BEFORE writing any code. Plan the feature end-to-end first.

---

## Required Flow

Every feature MUST go through these steps in order. Do NOT skip to implementation.

### Step 1 — Understand the Feature Goal

- What problem does this feature solve?
- Who uses it? (vendor, customer, guest, admin)
- What is the expected user flow?

### Step 2 — Identify Affected Tables

- Read `/supabase/docs/architecture.md` to understand existing tables
- List every table that will be read, written, or modified
- Check if new tables are needed or if existing ones can be extended

### Step 3 — Define Schema Changes

- New columns on existing tables?
- New tables?
- New foreign keys or indexes?
- Does `product_type` or other enums need new values?
- Reference `/supabase/schemas/tables.sql` and `/supabase/schemas/relationships.sql`

### Step 4 — Define RLS Impact

- For every new or modified table, define policies for: SELECT, INSERT, UPDATE, DELETE
- Reference `/supabase/docs/rls_map.md` for existing patterns
- Ask: Who should access this data? Owner only? Public? Service role only?
- Never leave a table without RLS enabled

### Step 5 — Define Trigger / Function Needs

- Does any action need to happen automatically? (auto-create rows, deduct stock, log activity)
- Reference `/supabase/docs/trigger_map.md` for existing patterns
- Can you reuse existing functions?
- If adding new triggers: what are the side effects?

### Step 6 — Define Frontend Requirements

- What pages/components need to be created or modified?
- What Supabase queries or server actions are needed?
- What is the data flow: client → server action → Supabase → response?

---

## Output Format

After completing all steps, produce this document:

```markdown
## Feature: [Name]

### Summary
[1-2 sentences describing what this feature does and who it's for]

### Schema Changes
- [ ] [Table.column — type — description]
- [ ] [New table — purpose]

### RLS Changes
- [ ] [Table — Operation — Rule]

### Trigger / Function Logic
- [ ] [Trigger name — event — what it does]

### API / Data Flow
1. [User action]
2. [Server action / client query]
3. [Database operation]
4. [Response]

### Risks & Edge Cases
- [What could go wrong?]
- [What about existing data?]
- [Concurrent access issues?]
- [Performance impact on large datasets?]
```

---

## Rules

1. **Do NOT jump to coding.** Complete all 6 steps first.
2. **Always plan backend first.** Schema → RLS → Triggers → then Frontend.
3. **Keep critical logic in the database.** Inventory calculations, payment state transitions, and access control belong in PostgreSQL (triggers, functions, RLS) — not in application code.
4. **Check for conflicts.** Will your schema changes conflict with existing triggers? Will new RLS policies overlap with existing ones?
5. **Consider reversibility.** Every migration must be atomic. Can your change be rolled back cleanly?
