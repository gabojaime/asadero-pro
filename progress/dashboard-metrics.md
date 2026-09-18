# Progress — dashboard-metrics

## 2026-09-16 17:10 — implementer (start)

**Task:** Prerequisites — read spec, begin Phase 0 + domain TDD.

**Notes:** Period timezone locked to **America/Caracas** (user directive; spec OQ-2 default was Mexico_City).

## 2026-09-16 17:15 — implementer

**Task:** T1–T3 — migration + types

**Changes:**
- `supabase/migrations/20260916210000_dashboard_metrics.sql` — merchant overhead/table count, `table_sessions_log.order_id`, session insert on dine-in completion
- `src/shared/infrastructure/database/supabase.types.ts` — new columns
- `docs/database-schema.md` — dashboard metrics section

**Verification:** `pnpm dlx supabase db push --local` applied migration.

## 2026-09-16 17:20 — implementer

**Task:** T4–T9 — domain + application (Vitest)

**Changes:**
- `src/domains/metrics/domain/*` — entities, formulas, validations, period bounds, repository port, tests
- `src/domains/metrics/application/build-dashboard-snapshot.ts` + tests
- `src/domains/metrics/infrastructure/supabase-metrics-read-repo.ts`, `dashboard-settings-actions.ts`

**Verification:** Vitest metrics tests green.

## 2026-09-16 17:25 — implementer

**Task:** T0 + T11–T15 — charts + presentation

**Changes:**
- `package.json` — `recharts`, `motion`
- `src/components/ui/mono-*` — vendored Mono-style charts (CLI `@subhanhq/amicro` npm 1.0.1 has no binary; documented in `presentation/charts/README.md`)
- `src/domains/metrics/presentation/*` — DashboardView, MetricTile, lazy charts, settings strip
- `src/app/(app)/dashboard/page.tsx` — RSC loader

**Verification:** Manual smoke admin `/dashboard` — tiles M-1–M-9 sections, charts render, food cost alert copy visible (73.3% fixture).

## 2026-09-16 17:30 — implementer (ready for review)

**Task:** T16–T20 — docs + checkpoint

**Changes:**
- `docs/metrics.md` — food cost numerator + CAC/LTV defer note
- `feature_list.json` → `review_pending`

**Verification:**
- Vitest **204/204**, `pnpm exec tsc --noEmit` clean
- Grep: no `@supabase/supabase-js` in metrics presentation; no direct `recharts` in metrics presentation
- Manual pending: AC-6 grill_master redirect, AC-10 dine-in session row, AC-11 waste empty state fixture, AC-12 flame red visual QA

**Open questions / follow-ups:**
- OQ-1: dashboard settings strip implemented (default)
- OQ-2: **America/Caracas** implemented (not Mexico_City)
- OQ-3: waste-log UI unchanged; link to `/waste-log` only
- Replace manual mono vendoring if Amicro publishes working CLI/registry

**Manual checklist (reviewer/human):**
- [ ] AC-6: login grill_master → denied `/dashboard`
- [ ] AC-10: complete dine-in with table → one `table_sessions_log` row
- [ ] AC-11: period with no kg receipts → waste empty copy
- [ ] AC-12: food cost over threshold → Flame Red caption on tile

## 2026-09-16 — spec_author

**Task:** Align spec text to **America/Caracas** (OQ-2 locked); README no longer describes stub/empty metrics domain.

**Files:** `specs/dashboard-metrics/{README,requirements,design,tasks}.md`. `feature_list.json` unchanged (review_pending).
