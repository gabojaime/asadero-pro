# Design — Metrics & Analytics Dashboard

## Route & flow

```
/admin session
  → GET /dashboard (RSC)
       → resolve merchantId + period (searchParams ?period=)
       → MetricsDashboardUseCase (application)
       → SupabaseMetricsReadRepository (infrastructure)
       → pass serializable DTO to DashboardView (presentation)
  → Client islands: PeriodSelector (optional client), MetricTiles, dynamic Mono chart wrappers
```

Existing gate: `src/app/(app)/dashboard/layout.tsx` — `allowedRoles={['admin']}`.

Thin server container in `src/app/(app)/dashboard/page.tsx` composes `domains/metrics/presentation/DashboardView.tsx`.

---

## Hexagonal layers

### Domain (`src/domains/metrics/domain/`)

| Module | Responsibility |
|--------|----------------|
| `entities.ts` | `DashboardPeriod`, `MetricSnapshot`, `TimeSeriesPoint`, `RankedPlateContribution`, alert enums |
| `formulas.ts` | Pure functions: food cost %, waste %, average ticket, ticket time stats, BEP, turnover |
| `validations.ts` | Zod for period param, overhead, table count |
| `repository.ts` | Port: `MetricsReadRepository` — raw aggregates, not SQL |

Reuse **cost math** from `src/domains/waste/domain/cost-formulas.ts` (import from application layer only — domain metrics may duplicate thin wrappers if circular imports appear; prefer shared pure functions in `waste/domain` called from metrics application).

### Application (`src/domains/metrics/application/`)

- `buildDashboardSnapshot(period, repo)` — orchestrates reads + domain formulas
- `updateMerchantDashboardSettings(overhead, tableCount)` — admin guard

### Infrastructure (`src/domains/metrics/infrastructure/`)

- `supabase-metrics-read-repo.ts` — server Supabase client; SQL/RPC or multiple queries merged in adapter
- `dashboard-settings-actions.ts` — server actions for FR-7
- Optional: extend `complete_order_and_deduct_inventory` migration in **`dashboard_metrics`** migration file (session log insert + merchant columns)

**Rule:** Presentation imports query helpers from `infrastructure/query-adapters.ts` only if client refetch is needed; prefer RSC props.

### Presentation (`src/domains/metrics/presentation/`)

| Component | Role |
|-----------|------|
| `DashboardView.tsx` | Layout sections Financial / Operational |
| `MetricTile.tsx` | DESIGN.md tile wrapper (shared or local) |
| `PeriodSelector.tsx` | Client: updates URL `?period=` |
| `charts/*ChartPanel.tsx` | Thin adapters: map DTO → Amicro component props |
| `dashboard-chart-skeleton.tsx` | Pulse skeleton matching DESIGN.md flat surfaces |

**No Supabase in presentation.**

---

## Chart stack: Amicro Mono Charts

Official catalog: [https://amicro.vercel.app/mono-charts](https://amicro.vercel.app/mono-charts)  
Source metadata: `Amicro--Micro-transitions-/src/data/monoCharts.ts` (30 components).

### Delivery model (not a separate charts npm package)

1. **CLI tool:** `@subhanhq/amicro` ([npm](https://www.npmjs.com/package/@subhanhq/amicro))
2. **Initialize once:** `npx @subhanhq/amicro@latest init`
3. **Add components:** `npx @subhanhq/amicro@latest add <kebab-name>` copies TSX into the project (typically `src/components/ui/<kebab-name>/` per generated snippets).
4. **Prerequisites (Amicro docs):** React 18/19, Tailwind 3/4, **`motion`** (`motion/react` animations).
5. **Internal implementation:** Vendored Mono chart files use **Recharts** (`recharts` imports inside copied components). **Do not** import Recharts from `domains/metrics/presentation/` or build parallel Chart.js/Recharts dashboards. Add `recharts` and `motion` to `package.json` only as dependencies required by vendored Amicro files.

### shadcn registry (optional path)

Project already has `components.json`. Alternative install:

```bash
npx shadcn add @amicro/mono-rounded-line
```

Requires `registries.@amicro` pointing at Amicro GitHub registry (see Amicro README). **Prefer one path** (CLI `add` or shadcn `@amicro/*`) — implementer picks one; do not duplicate components.

### Lazy loading (MVP §6.3)

Create `src/domains/metrics/presentation/charts/lazy-charts.ts`:

```typescript
"use client";

import dynamic from "next/dynamic";
import { DashboardChartSkeleton } from "../dashboard-chart-skeleton";

export const FoodCostTrendChart = dynamic(
  () => import("./FoodCostTrendChartPanel").then((m) => m.FoodCostTrendChartPanel),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);
// ... one dynamic export per chart panel
```

Server passes **serialized JSON props** into client panels (no functions).

### Parameterizing vendored components

Stock Amicro demos embed static demo arrays. **Implementer task:** fork vendored files minimally so each exported chart accepts props such as `{ data, theme, accentColor, title, valueFormatter }` while keeping Recharts markup inside the vendored file. Wrappers in `presentation/charts/*Panel.tsx` stay thin.

---

## Metric → visualization map

| Metric ID | Primary UI | Amicro CLI `kebab-name` | React export (from snippet) | Notes |
|-----------|------------|-------------------------|-----------------------------|-------|
| M-1 Food Cost % | Metric Tile + trend | `mono-rounded-line` | `MonoRoundedLineChart` | Second series optional: target % flat line |
| M-2 Contribution by plate | Chart only (ranking) | `mono-rounded-bar` | `MonoRoundedBarChart` | Horizontal layout; top 8 meat plates |
| M-3 BEP progress | Metric Tile + gauge | `mono-rounded-gauge-arc` | `MonoRoundedGaugeArc` | MTD progress toward BEP revenue |
| M-4 BEP portions | Metric Tile | — | — | **KPI / alert only, no chart** |
| M-5 Waste % | Metric Tile + mix | `mono-rounded-donut` | `MonoRoundedDonutChart` | Segments = `waste_reason` |
| M-6 Average ticket | Metric Tile + spark | `mono-rounded-sparkline` | `MonoRoundedSparklineChart` | Fallback: `mono-rounded-kpi` if sparkline too narrow |
| M-7 Ticket time | Metric Tile + trend | `mono-rounded-bar` | `MonoRoundedBarChart` | Daily median minutes |
| M-8 Session heatmap | Chart | `mono-rounded-heatmap` | `MonoRoundedHeatmapChart` | Alt: `mono-activity-green` + themed accent |
| M-9 Turnover | Chart | `mono-rounded-bar` | `MonoRoundedBarChart` | By day-of-week bars |

**Not used in MVP dashboard (avoid chart noise):** candlestick, sankey, radar, treemap, stream, polar, bubble, waterfall, composed (unless human expands scope).

---

## DESIGN.md theming

- **Metric Tiles:** `surface_pearl` / `card_tile_1`, 1px hairline border, no drop shadows — primary KPIs including M-1, M-4, M-5, M-6, M-7.
- **Alerts:** Flame Red `#e11d48` (`brand.primary`) for over-threshold captions (Food Cost, Waste ≥ 5%, ticket time tails).
- **Safe band:** Muted green caption only for within-target Food Cost and Waste < 5% — use existing success token from DESIGN.md if defined; otherwise neutral + explicit “Dentro de meta” copy (no extra accent colors for actions).
- **Amicro shells:** Override demo hardcoded `#181818` / neutral palettes in vendored files to CSS variables / Tailwind tokens mapped in `globals.css` (canvas, ink, hairline). Chart accent stroke/fill defaults to **monochrome ink**; threshold breaches use Flame Red for single-series highlight.
- **Typography:** Weights 300/400/600/700 only (no 500).
- **Units:** Always show `%`, `min`, `$`, `kg` in labels (DESIGN.md §5).

---

## Data model changes

Migration `YYYYMMDDHHMMSS_dashboard_metrics.sql`:

```sql
ALTER TABLE merchants
  ADD COLUMN monthly_fixed_overhead DECIMAL(12, 2) NULL CHECK (monthly_fixed_overhead IS NULL OR monthly_fixed_overhead >= 0),
  ADD COLUMN seating_table_count INT NULL CHECK (seating_table_count IS NULL OR seating_table_count > 0);

ALTER TABLE table_sessions_log
  ADD COLUMN order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_table_sessions_order_unique
  ON table_sessions_log (order_id)
  WHERE order_id IS NOT NULL;
```

Extend `complete_order_and_deduct_inventory` (same migration or follow-up) to INSERT session log per FR-6.

Update `docs/database-schema.md` via implementer after migration (harness convention).

---

## Repository queries (sketch)

| Aggregate | Tables |
|-----------|--------|
| Net sales | `orders` |
| Deduction cost | `inventory_movements` |
| Waste cost/kg | `waste_logs` |
| Receipt kg | `inventory_movements` + join `raw_materials_inventory` (`kilogram`) |
| Lines sold | `order_items` → `orders` → `menu_items` |
| Recipes / merma | `recipe_ingredients`, `menu_item_costing` |
| Ticket times | `orders.sent_to_kitchen_at`, `ready_at` |
| Sessions | `table_sessions_log` |
| Settings | `merchants` |

Prefer bounded queries with `created_at` indexes from schema. For MTD charts, bucket by day in application layer from raw rows or SQL `date_trunc`.

### Period timezone (OQ-2 locked)

- **Constant:** `DASHBOARD_TIMEZONE = "America/Caracas"` in `domains/metrics/domain/entities.ts` (shared with period-bound helpers).
- **Bounds:** `resolvePeriodBounds(period, now, timeZone?)` computes start/end instants for **today**, **last 7 days** (inclusive local days), and **month to date** (calendar month in Caracas).
- **Chart keys:** Daily series keys (`YYYY-MM-DD`) use the same zone so Waste % and waste-log history “today” align for staff reviewing the floor list vs dashboard tiles.
- **Future:** When `merchants.timezone` exists, inject merchant IANA id instead of the constant (single migration path for dashboard + waste logging).

---

## Performance budgets

| Budget | Target |
|--------|--------|
| RSC dashboard shell TTFB | Aggregations ≤ 6 parallel queries; avoid N+1 |
| JS chart bundle | Loaded only via dynamic imports; initial route avoids importing `recharts` |
| Largest chart panel | < 25 KB gzip incremental per panel (after split) |
| Rows scanned | Period limited; orders index `(merchant_id, created_at)` |
| CLS | Skeleton fixed height (`min-h-[290px]` matching Amicro default) |

---

## TanStack Query (optional)

If period selector is client-side without full route navigation:

- Query key: `['dashboard-metrics', merchantId, period]`
- `staleTime: 60_000`, `refetchOnWindowFocus: false`

Default recommendation: **URL-driven RSC refresh** (no client cache required for MVP).

---

## RLS

Read paths use authenticated user; all tables already tenant-scoped. Admin-only writes for merchant overhead fields (policy: `get_user_role() = 'admin'` UPDATE on `merchants` for new columns — add migration policy if missing).

---

## docs/metrics.md alignment note

Update Food Cost numerator to include logged waste cost when implementer updates docs. Contribution and BEP formulas already aligned; CAC/LTV remain documented but not implemented here.
