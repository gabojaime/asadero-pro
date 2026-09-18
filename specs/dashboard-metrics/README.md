# Metrics & Analytics Dashboard

## Problem

Admins need a single **command center** (`/dashboard`) to decide this week: whether food cost is drifting above the 30–35% band, which meat cuts fund fixed costs, if grill service times risk dry meat, when to run Tue/Wed promotions, and whether waste or purchasing needs correction.

Admin route **`/dashboard`** (RSC + client chart islands) and bounded context **`src/domains/metrics/`** implement this spec. Business requirements live in [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §6 and [docs/metrics.md](../../docs/metrics.md).

## Goals

1. **Decision-grade KPIs only** — Every tile/chart must support an operational or financial action (pricing, purchasing, staffing grill, promotions, waste control). No vanity counts.
2. **Data-grounded** — Metrics computed only from tables the MVP already has (or extends in this spec): `orders`, `order_items`, `inventory_movements`, `waste_logs`, `menu_items`, `recipe_ingredients`, `menu_item_costing`, `merchants`, `table_sessions_log`.
3. **Admin-only** — `/dashboard` remains `admin` (existing `RoleRouteGate`).
4. **Hexagonal** — Pure formulas in `domains/metrics/domain/`; aggregation ports in infrastructure; **no** `@supabase/supabase-js` in presentation.
5. **Server-first aggregations** — Period totals and series computed on the server (RSC / server loaders); charts are client islands.
6. **Amicro Mono Charts** — All dashboard charts use [Amicro Mono Charts](https://amicro.vercel.app/mono-charts), vendored via `@subhanhq/amicro` CLI (copy-to-code). Lazy-loaded with `next/dynamic` per MVP §6.3. **No second chart library** (see [design.md](./design.md#chart-stack-amicro-mono-charts)).
7. **DESIGN.md** — Metric Tiles for primary KPIs/alerts; chart shells themed to asadero tokens (Flame Red thresholds).

## Bounded context

**Primary:** `src/domains/metrics/` — metric definitions, aggregation use cases, dashboard presentation.

**Dependencies (existing features):**

| Feature | Status | Provides |
|---------|--------|----------|
| [order-kitchen-queue](../order-kitchen-queue/) | done | `sent_to_kitchen_at`, `ready_at`, order lifecycle |
| [waste-cost-calculator](../waste-cost-calculator/) | review_pending | `order_deduction` movements, `target_food_cost_pct`, costing formulas |
| [menu-items-crud](../menu-items-crud/) | review_pending | `protein_group`, `item_kind` |
| [raw-materials-inventory](../raw-materials-inventory/) | done | WAC, receipts |

## Roles affected

| Role | Access |
|------|--------|
| `admin` | Full `/dashboard` |
| `grill_master` | Blocked (unchanged RBAC) |
| `waiter` | Blocked |

## In scope

- Period selector: **Today**, **Last 7 days**, **Month to date** (calendar boundaries in **`America/Caracas`**, aligned with [operational-waste-logging](../operational-waste-logging/) calendar day until `merchants.timezone` exists — locked OQ-2).
- Financial KPIs: Food Cost %, contribution by meat plate, break-even progress.
- Operational KPIs: Waste % (when data exists), average ticket, ticket time (kitchen), table session intensity (dead-hour signal), table turnover.
- Schema extension: `merchants.monthly_fixed_overhead`, `merchants.seating_table_count`; populate `table_sessions_log` on `dine_in` order completion.
- Amicro chart vendoring, theming wrappers, dynamic import boundary.
- Vitest for pure metric math; manual verification for UI/RLS.

## Out of scope (this feature)

- **CAC / LTV** — No marketing spend or customer identity tables (deferred; see requirements).
- **Live occupancy %** — No open-table session model (deferred; proxy via session heatmap).
- **Operational waste logging UI** — INSERT UI specified in [specs/operational-waste-logging/](../operational-waste-logging/); dashboard **reads** those rows (implement logging before or alongside Waste % / Food Cost waste numerator).
- **Payment capture / fiscal receipts** — Revenue = completed order totals only.
- **Grill_master or waiter dashboard views** — Admin only.
- **Realtime dashboard** — 60s stale cache acceptable; no Supabase Realtime on metrics.

## Follow-up doc note

After implementation, align [docs/metrics.md](../../docs/metrics.md) Food Cost % numerator with `(order_deduction cost + waste_logs cost) / net sales` (implementer or leader task — not spec_author rewrite during implementation unless human requests).

## Links

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)

## Proposed `feature_list.json` entry (leader adds)

```json
{
  "id": "dashboard-metrics",
  "title": "Metrics & Analytics Dashboard (Financial + Operational)",
  "status": "pending",
  "verification": "automated",
  "notes": "OQ-2 locked: America/Caracas period bounds (aligned with waste-log calendar day). Vitest domain formulas; manual UI/RLS/charts.",
  "spec": "specs/dashboard-metrics/",
  "spec_path": "specs/dashboard-metrics/",
  "progress_path": "progress/dashboard-metrics.md"
}
```
