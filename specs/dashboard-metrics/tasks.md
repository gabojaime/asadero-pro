# Tasks — Metrics & Analytics Dashboard

**Gate:** Human approves spec + OQ-1–OQ-3. Leader sets `feature_list.json` → `spec_ready` / `in_progress` and creates `progress/dashboard-metrics.md`.

**Dependencies:** `order-kitchen-queue` (done), `waste-cost-calculator` + `menu-items-crud` (should be merged or available locally for costing/recipes).

---

## Phase 0 — Amicro Mono Charts setup

- [ ] **T0a** — Run `npx @subhanhq/amicro@latest init` in repo root; align output paths with existing `components.json` (`@/` → `src/`). (`manual`)
- [ ] **T0b** — Add dependencies required by vendored charts: `motion`, `recharts` (and `@types` if needed). Do **not** add `chart.js` or `react-chartjs-2`. (`manual`)
- [ ] **T0c** — Vendor required Mono Charts via CLI (one command per component):

  `mono-rounded-line`, `mono-rounded-bar`, `mono-rounded-donut`, `mono-rounded-gauge-arc`, `mono-rounded-sparkline`, `mono-rounded-heatmap`, and fallback `mono-rounded-kpi` if sparkline sizing fails review.

  (`manual`)

- [ ] **T0d** — Parameterize each vendored chart to accept external `data` + `theme` props (minimal diff from upstream). Document prop contracts in `presentation/charts/README.md` (English, 1 screen). (`manual`)

- [ ] **T0e** — Map Amicro demo colors to DESIGN.md tokens in vendored files (Flame Red for alert series). (`manual`)

---

## Phase 1 — Schema & session logging

- [ ] **T1** — Migration `dashboard_metrics`: `merchants.monthly_fixed_overhead`, `merchants.seating_table_count`; `table_sessions_log.order_id` + unique index; admin UPDATE RLS on new merchant columns if needed. (`manual`)
- [ ] **T2** — Extend `complete_order_and_deduct_inventory` to insert `table_sessions_log` for `dine_in` + `table_number` (idempotent on `order_id`). (`manual`)
- [ ] **T3** — Regenerate `supabase.types.ts`. (`manual`)

---

## Phase 2 — Domain formulas (TDD)

- [ ] **T4** — `domains/metrics/domain/entities.ts`, `errors.ts`. (`vitest` prep)
- [ ] **T5** — `domains/metrics/domain/formulas.ts`: M-1, M-5, M-6, M-7 stats, M-3/M-4 BEP, M-9 turnover. (`vitest`)
- [ ] **T6** — `domains/metrics/domain/formulas.test.ts` — fixtures for AC-2–AC-5, zero-sales guards. (`vitest`)
- [ ] **T7** — `domains/metrics/domain/validations.ts` + tests for overhead/table count/period. (`vitest`)

---

## Phase 3 — Infrastructure & application

- [ ] **T8** — `MetricsReadRepository` port + `supabase-metrics-read-repo.ts` (server-only). (`manual` + unit tests with fake repo)
- [ ] **T9** — `buildDashboardSnapshot` use case + `use-cases.test.ts` with in-memory fake. (`vitest`)
- [ ] **T10** — `updateMerchantDashboardSettings` server action (admin). (`manual`)

---

## Phase 4 — Presentation & charts

- [ ] **T11** — `MetricTile.tsx` per DESIGN.md (caption thresholds M-1, M-5, M-7). (`manual` L2)
- [ ] **T12** — `lazy-charts.ts` + `DashboardChartSkeleton` — all chart panels via `next/dynamic`, `ssr: false`. (`manual` + AC-8 review)
- [ ] **T13** — Chart panels: FoodCostTrend (`mono-rounded-line`), ContributionRank (`mono-rounded-bar`), BepGauge (`mono-rounded-gauge-arc`), WasteMix (`mono-rounded-donut`), AvgTicketSpark (`mono-rounded-sparkline`), TicketTimeTrend (`mono-rounded-bar`), SessionHeatmap (`mono-rounded-heatmap`), TurnoverByDow (`mono-rounded-bar`). (`manual` L2)
- [ ] **T14** — `DashboardView.tsx` — sections, period selector (URL), settings strip, empty/error states (Spanish copy). (`manual` L2)
- [ ] **T15** — Wire `src/app/(app)/dashboard/page.tsx` as RSC loader passing DTO. (`manual` L2)

---

## Phase 5 — Verification & docs

- [ ] **T16** — Grep: no `@supabase/supabase-js` in metrics presentation; no direct `recharts` imports outside `src/components/ui/mono-*`. (`manual`)
- [ ] **T17** — Manual RBAC: grill_master/waiter denied `/dashboard`. (`manual` L2)
- [ ] **T18** — Manual: complete dine-in order → session row → heatmap populates. (`manual` L3)
- [ ] **T19** — Patch `docs/metrics.md` Food Cost numerator (waste + deduction) + defer CAC/LTV note. (`manual`)
- [ ] **T20** — Walk AC-1–AC-12; record in `progress/dashboard-metrics.md`. (`manual`)

---

## Checkpoint: After T6 + T9

- [ ] All Vitest green
- [ ] `pnpm tsc --noEmit` clean

## Checkpoint: After T15

- [ ] Dashboard loads with skeletons then charts
- [ ] Lighthouse: no massive JS on first paint from Recharts (dynamic only)

---

## Suggested CLI adds (copy-paste for implementer)

```bash
npx @subhanhq/amicro@latest add mono-rounded-line
npx @subhanhq/amicro@latest add mono-rounded-bar
npx @subhanhq/amicro@latest add mono-rounded-donut
npx @subhanhq/amicro@latest add mono-rounded-gauge-arc
npx @subhanhq/amicro@latest add mono-rounded-sparkline
npx @subhanhq/amicro@latest add mono-rounded-heatmap
npx @subhanhq/amicro@latest add mono-rounded-kpi
```

Official reference: [Amicro Mono Charts](https://amicro.vercel.app/mono-charts).
