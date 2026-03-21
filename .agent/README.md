# .agent — AI Agent Workspace

## Purpose

This folder contains **skills** — structured guides that teach AI agents how to safely understand, plan, and modify this codebase. Think of them as operating procedures that prevent agents from guessing, breaking things, or skipping critical steps.

## How to Use

**Rule: Always load the relevant skill before acting.**

| Situation | Skill to Load |
|---|---|
| Need to understand the system before making changes | `skills/system_understanding.md` |
| Planning a new feature or change | `skills/feature_planning.md` |
| Modifying the database (tables, RLS, triggers, migrations) | `skills/supabase_backend.md` |

### Workflow

1. **Read first.** Load `system_understanding.md` to orient yourself in the codebase.
2. **Plan second.** Use `feature_planning.md` to design before you code.
3. **Modify safely.** Follow `supabase_backend.md` when touching the database.

## Project Stack

- **Frontend:** Next.js (App Router) + TypeScript
- **Backend:** Supabase (PostgreSQL, RLS, Storage)
- **Database Management:** Supabase CLI with version-controlled migrations
- **Schema Docs:** `/supabase/docs/` and `/supabase/schemas/`

## Golden Rules

1. **Never assume schema** — always read before modifying.
2. **Never skip RLS** — every table must have policies.
3. **Never edit the DB directly** — always use migrations.
4. **Never jump to code** — always plan backend changes first.
