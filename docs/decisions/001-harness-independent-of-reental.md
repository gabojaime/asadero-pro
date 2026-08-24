# ADR-001: Independent agent harness (not Reental)

## Status

Accepted

## Date

2026-08-24

## Context

User-level agents (`leader`, `spec_author`, `implementer`, `reviewer`, `web-performance-auditor`, `notion-task-manager`) and `reental-skills-router` were built for Reental repos. asadero-pro needs the same SDD workflow (specs on disk, progress journals, human approval) but is a different product: Next.js 15 App Router, Supabase, hexagonal domains, no Web3.

`.cursor/rules/` already described product conventions, with internal conflicts (root `app/` vs `src/app/`, `modules` vs `domains`, dashboard hooks calling Supabase, incomplete RLS).

## Decision

1. Install a **repo-local harness** (`AGENTS.md`, `docs/`, `feature_list.json`, `CHECKPOINTS.md`, `specs/`, `progress/`, `init.mjs`) with `"project": "asadero-pro"`.
2. **Do not invoke** `notion-task-manager` (hardcoded Reental Kanban V2).
3. Use the skills router **only** to honor **Applicable agent-skills** in this `AGENTS.md`. Do not load `references/reental.md`.
4. When `.cursor/rules/` disagrees, **`docs/` wins**. Reconciliations:
   - Folders: `src/app/` + `src/domains/<context>/{domain,application,infrastructure,presentation}` + `src/shared/`
   - Routes: `(auth)` / `(app)` groups from the routing map, placed under `src/app/`
   - Schema: `docs/database-schema.md` (from `01-dabasase.md`); illustrative extra columns in the architecture templates are not MVP
   - Domain stock field: `stockKg` ↔ `stock_kg`
   - UI never imports Supabase; query adapters in infrastructure
   - RLS via `get_user_merchant_id()`, not `merchants.id = auth.uid()`
   - Package manager: pnpm
   - Generated types: `src/shared/infrastructure/database/supabase.types.ts`

## Consequences

- Agents can run the SDD loop without treating this repo as reental.co.
- Original `.cursor/rules/*.md` files remain as historical product specs; they are not `.mdc` Cursor rules.
- Shared user-level agent files still mention Reental; this ADR and `AGENTS.md` override those sections for this workspace.
