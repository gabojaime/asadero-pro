# ADR-002: Presentation layer follows DESIGN.md

## Status

Accepted

## Date

2026-08-24

## Context

asadero-pro uses hexagonal layers (`docs/architecture.md`). Domain and application are pure TypeScript. Presentation (App Router pages, shared components, future `src/domains/*/presentation/`) still needed a single visual contract so agents do not invent palettes, shadows, or extra accents.

The human-authored source of that contract is [DESIGN.md](../../DESIGN.md) at the repository root (Google Labs DESIGN.md format: tokens, shadcn/Tailwind mapping, named components, prohibited antipatterns). The Next.js `with-supabase` scaffold may disagree with those tokens.

## Decision

1. **DESIGN.md is the UI contract** for the presentation layer. Harness files (`AGENTS.md`, `docs/conventions.md`, `docs/architecture.md`, `docs/specs.md`, `CHECKPOINTS.md`, `.cursor/rules/ui-design.mdc`) point to it; they do not duplicate the token registry.
2. **Hexagonal domain and application layers are unchanged** — no design tokens, React, or CSS in those layers.
3. DESIGN.md stays at the **repo root** (not moved under `docs/`) so `@DESIGN.md` and agent globs remain stable.
4. For **new** UI, DESIGN.md wins over template defaults. A full restyle of the scaffold is **out of scope** unless a feature spec requires existing pages to comply.

## Consequences

- `spec_author` UI `design.md` files must cite DESIGN.md tokens and components to reuse.
- `implementer` and `frontend-ui-engineering` must follow DESIGN.md when touching `app/`, `components/`, CSS, or future presentation folders.
- `reviewer` checks presentation diffs against DESIGN.md via `CHECKPOINTS.md`.
