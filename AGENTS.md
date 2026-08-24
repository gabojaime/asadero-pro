# Asadero Pro — Agent Harness

Entry map for AI-assisted feature development using Spec-Driven Development (SDD).

**This repository is not Reental.** It is an independent BBQ / steakhouse multi-tenant MVP (Next.js 15 App Router, Supabase, TanStack Query, hexagonal architecture). User-level agents at `~/.cursor/agents/` are shared tooling; **Reental stack, overlays, Notion Kanban V2, Web3, GraphQL, Pages Router, and i18n namespaces do not apply here.**

When a user-level agent file contains a "Reental patterns" or "Reental-specific guidance" section, **ignore it** and follow this file plus `docs/` instead.

## Quick links

| Resource | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | Stack, hexagonal layers, folder layout, routes |
| [docs/conventions.md](docs/conventions.md) | Coding patterns, language, immutability |
| [docs/database-schema.md](docs/database-schema.md) | PostgreSQL tables, indexes, RLS |
| [docs/supabase.md](docs/supabase.md) | Local Supabase, migrations, generated types |
| [docs/metrics.md](docs/metrics.md) | Financial and operational dashboard formulas |
| [docs/testing.md](docs/testing.md) | Domain TDD, AAA, Vitest |
| [docs/specs.md](docs/specs.md) | How specs are written and approved |
| [docs/verification.md](docs/verification.md) | Manual and automated verification |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Definition of done |
| [feature_list.json](feature_list.json) | Feature backlog and status |
| [progress/](progress/) | One journal file per feature |
| [specs/](specs/) | Feature specifications (created per feature) |

Product specs that seeded this harness live in [`.cursor/rules/`](.cursor/rules/). **If those files disagree with `docs/`, `docs/` wins** (reconciled in [docs/decisions/001-harness-independent-of-reental.md](docs/decisions/001-harness-independent-of-reental.md)).

## User-level agents

Agents live at `~/.cursor/agents/` and are reusable across repos. In **this** repo:

| Agent | Role in asadero-pro |
|-------|---------------------|
| `leader` | Orchestrates workflow, updates backlog, never edits `src/` |
| `spec_author` | Writes `specs/<feature>/` only (read-only on `src/`) |
| `implementer` | Implements approved specs, updates `progress/<feature>.md` |
| `reviewer` | Read-only review against `docs/` and `CHECKPOINTS.md` |
| `web-performance-auditor` | Optional read-only CWV audit; writes to `progress/<feature>.md` |
| `notion-task-manager` | **Do not invoke.** Hardcoded to Reental Kanban V2 |

Leader **must not** launch `notion-task-manager` for this project. Track status only in `feature_list.json` and `progress/<feature>.md`.

User-level skills live at `~/.cursor/skills/`. Use `~/.cursor/skills/reental-skills-router/SKILL.md` **only** as the skill-routing mechanic (read the manifest below). Do **not** load `references/reental.md` overlays.

## Applicable agent-skills (asadero-pro)

Only invoke skills listed here. Read full `SKILL.md` when the task matches.

| Priority | Skill / agent | When |
|----------|---------------|------|
| **High** | `frontend-ui-engineering` | UI, layouts, dashboard, forms, App Router pages |
| **High** | `incremental-implementation` | Implementer executing `tasks.md` |
| **High** | `security-and-hardening` | Auth, RLS, multi-tenant isolation, roles |
| Medium | `planning-and-task-breakdown` | spec_author decomposing work (output still goes to `specs/<feature>/`) |
| Medium | `test-driven-development` | Domain/application pure logic; required when `verification` includes `automated` |
| Medium | `browser-testing-with-devtools` | UI debug and manual smoke in the browser |
| Medium | `debugging-and-error-recovery` | Runtime errors, Supabase/RLS failures |
| Medium | `code-review-and-quality` | Reviewer |
| Medium | `code-simplification` | Reviewer post-implementation |
| Medium | `performance-optimization` | Charts, dashboard bundle, CLS/LCP |
| Medium | `web-performance-auditor` (agent) | Structured CWV audit; via leader or explicit user request |
| Medium | `context-engineering` | Long sessions, multi-file flows |
| Medium | `source-driven-development` | Official Next.js 15, Supabase, TanStack Query docs |
| Medium | `api-and-interface-design` | Domain ports (repository interfaces) and use-case contracts |
| Low | `interview-me`, `idea-refine` | Vague requirements before spec |
| Low | `git-workflow-and-versioning` | Commits/PR when the user asks |
| Low | `documentation-and-adrs` | Architecture decisions |
| Low | `observability-and-instrumentation` | When adding logging/metrics (not Sentry-by-default) |
| **Do not use** | `spec-driven-development` | Use harness `spec_author` + `docs/specs.md` |
| **Do not use** | `doubt-driven-development` for Web3 | No on-chain work in this repo |
| **Do not use** | `ci-cd-and-automation`, `shipping-and-launch` | Until a pipeline exists |
| **Do not use** | `deprecation-and-migration` | Unless an explicit migration task |

**Harness wins:** specs in `specs/<feature>/`, progress in `progress/<feature>.md` — not addyosmani `tasks/plan.md`.

Project-local skills: none yet. Product rules (not skills) remain under `.cursor/rules/`.

## Workflow

```
pending → spec_author → spec_ready → HUMAN APPROVAL → in_progress → implementer → review_pending → reviewer → done
```

1. Add or pick a feature in `feature_list.json` (`pending`)
2. Run **spec_author** → writes `specs/<feature>/`
3. Leader sets `spec_ready` → **human approves**
4. Leader sets `in_progress` → run **implementer** (no Notion sync)
5. Implementer completes → `review_pending` → run **reviewer**
6. Reviewer passes → leader sets `done`

## Progress journals

One file per feature under `progress/`. See [progress/README.md](progress/README.md).

Subagents **write to disk** before reporting in chat (anti telephone game).

## Language

- **User communication:** Spanish
- **Code, commits, specs, docs, SQL, comments:** English (see `.cursorrules` and `docs/conventions.md`)

## Verification

Default: **automated for pure domain logic** (Vitest, `docs/testing.md`) and **manual for UI / Supabase / RLS** (`docs/verification.md`).

Leader still asks on the first feature of a session:

> ¿Prefieres verificación manual o automatizada (tests) para esta feature?

Record the answer on the feature in `feature_list.json` (`verification`: `manual` | `automated`).

## Init

Validate harness setup:

```bash
node init.mjs
```

## Starting a feature

1. Add entry to `feature_list.json`
2. Create `progress/<feature>.md` with initial state
3. Invoke **leader** with the feature id
4. Follow the workflow above

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
