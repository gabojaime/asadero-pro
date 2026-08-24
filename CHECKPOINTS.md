# Checkpoints — asadero-pro

Definition of done for agent-driven features. Reviewer validates against this list; leader marks `done` only when all applicable items pass.

This checklist is for the BBQ multi-tenant MVP. It is **not** the Reental checklist (no Pages Router, GraphQL, wagmi, KYC, or i18n namespaces).

## Spec & process

- [ ] Spec approved by human before implementation started
- [ ] `feature_list.json` status accurately reflects workflow stage
- [ ] `progress/<feature>.md` has chronological entries for spec, implement, and review
- [ ] No scope creep beyond `specs/<feature>/` without spec update and re-approval

## Code quality

- [ ] Changes follow `docs/conventions.md` (English identifiers, immutability, Clean Code)
- [ ] Hexagonal layers are not mixed (`docs/architecture.md`)
- [ ] Minimal diff — no unrelated refactors
- [ ] No secrets committed (`.env`, service role keys)

## Architecture fit

- [ ] Domain code is pure TypeScript (no React, Next, Supabase, or TanStack Query imports)
- [ ] Application layer depends on ports, never on Supabase clients
- [ ] Infrastructure implements repositories and TanStack Query adapters
- [ ] `src/app/` pages are view containers only (hooks from `domains/*/presentation` or query adapters)
- [ ] Presentation and `src/app/` never import `@supabase/supabase-js` directly
- [ ] Routes live under `src/app/(auth)/` or `src/app/(app)/` as specified in `docs/architecture.md`
- [ ] Auth guard for `(app)` is middleware or a Server Component `redirect()`, not a client-only check as the security boundary

## Presentation / UI

Applies when the feature changes pages, components, or CSS (including the current `app/` + `components/` scaffold).

- [ ] Presentation changes match [DESIGN.md](DESIGN.md) (tokens, named components, typography/radius rules, prohibited antipatterns). No parallel design system.

## Data & tenancy

- [ ] Schema changes landed as Supabase migrations (`docs/supabase.md`), not Studio-only edits
- [ ] Table/column names match `docs/database-schema.md` (English)
- [ ] Queries are scoped by `merchant_id` / RLS (`get_user_merchant_id()`)
- [ ] Generated types updated after migrations (`src/shared/infrastructure/database/supabase.types.ts`)

## Verification

- [ ] Domain logic covered by Vitest when the feature touches `domain/` or `application/` (`docs/testing.md`)
- [ ] Manual verification documented per `docs/verification.md`
- [ ] Acceptance criteria from spec exercised or explicitly deferred with reason
- [ ] Reviewer verdict: `pass` or `pass_with_notes` (no blocking `fail` items open)

## Documentation

- [ ] Progress journal includes verification notes
- [ ] Known limitations and follow-ups recorded in the progress journal

## Out of scope (do not block on)

- Reental Notion Kanban sync
- i18n locale files
- Web3 / wallet flows
- CI pipeline
- Production deploy
