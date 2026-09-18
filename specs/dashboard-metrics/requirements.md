# Requirements — Metrics & Analytics Dashboard

## User stories

### US-1 — Admin reviews weekly health

As an **admin**, I open `/dashboard`, pick **Last 7 days**, and see whether food cost, waste, ticket time, and sales mix require action before the next meat purchase.

### US-2 — Admin reacts to food cost alert

As an **admin**, when Food Cost % exceeds the merchant target band, the primary KPI uses **Flame Red** styling so I re-check WAC, menu prices, or supplier quotes.

### US-3 — Admin prioritizes cuts

As an **admin**, I compare **contribution margin dollars by meat plate** sold in the period to decide which cuts to promote or repricing on `/menu` and `/waste`.

### US-4 — Admin tracks break-even

As an **admin**, I enter **monthly fixed overhead** once and see how close month-to-date net sales are to the break-even revenue target.

### US-5 — Admin spots grill bottleneck

As an **admin**, I see median and tail **ticket time** (kitchen) so I can adjust grill staffing or queue discipline before quality drops.

### US-6 — Admin plans slow-day promos

As an **admin**, I see **when dine-in sessions cluster** (hour × day-of-week) to target Tue/Wed promotions.

---

## Period & tenancy

### FR-1 — Period filter

Dashboard supports `today | last_7_days | month_to_date`. All aggregates filter by `merchant_id = get_user_merchant_id()` and order/waste/movement timestamps within the period bounds.

**Timezone:** Period bounds (today, last 7 days, month-to-date, daily chart buckets) use IANA **`America/Caracas`** until `merchants.timezone` exists (locked **OQ-2**). Same calendar-day convention as operational waste history ([operational-waste-logging](../operational-waste-logging/requirements.md#resolved-decisions-locked) OQ-5).

### FR-2 — Revenue basis (net sales)

**Net sales** = sum of `orders.total_amount` where `status = 'completed'` and `created_at` (or `inventory_deducted_at` — pick one and use consistently; **default `inventory_deducted_at` fallback `updated_at`**) falls in the period. Exclude `cancelled`. Include `delivery_fee` inside `total_amount` if the order RPC already rolls it in (verify at implementation).

### FR-3 — Variable COGS basis

**Ingredient cost consumed** = sum over `inventory_movements` where `movement_type = 'order_deduction'` and movement `created_at` in period: `quantity * unit_cost`.

**Logged waste cost** = sum of `waste_logs.total_cost` where `created_at` in period.

---

## In-scope metrics (decision table)

Each metric MUST appear on the dashboard (tile and/or chart). Formulas are implemented as pure functions in `domains/metrics/domain/` (Vitest).

### M-1 — Food Cost %

| Field | Value |
|-------|--------|
| **Formula** | `((ingredientCostConsumed + loggedWasteCost) / netSales) × 100` |
| **Inputs** | FR-2 net sales; FR-3 costs |
| **Decision** | Adjust menu prices, renegotiate meat, reduce waste, review `/waste` merma assumptions |
| **Threshold** | Compare to merchant `target_food_cost_pct` (default 0.33 → 33%). **Alert:** Flame Red caption when result **>** `target × 100 + 2` pp OR **>** 35% absolute ceiling (whichever stricter). Green caption when within `[target×100 − 2, target×100 + 2]` |
| **Empty state** | No completed orders in period → tile “Sin ventas cerradas en el periodo” (Spanish UI copy) |
| **Visualization** | **Metric Tile** (primary) + Amicro **`mono-rounded-line`** daily series (see design.md) |

### M-2 — Contribution margin by meat plate (sold)

| Field | Value |
|-------|--------|
| **Formula (per line)** | `lineSubtotal − lineVariableCost` where `lineSubtotal = order_items.subtotal`, `lineVariableCost = quantity × Σ(recipe_ingredients.quantity_kg × realCostPerKg(wac, waste_pct))` using WAC at aggregation time from `raw_materials_inventory.unit_cost` and `menu_item_costing.waste_pct` via existing waste domain helpers |
| **Aggregation** | Group by `menu_item_id` (display `name`, `protein_group`, `weight_label`); sum margin dollars in period for `item_kind = 'meat_plate'` only |
| **Decision** | Promote high contributors; repricing or recipe adjust on low/negative contributors |
| **Threshold** | Highlight bottom 2 plates with negative margin in Flame Red in chart legend/caption |
| **Empty state** | No meat plate lines sold → empty chart message |
| **Visualization** | Amicro **`mono-rounded-bar`** (horizontal ranking, top 8 plates) |

### M-3 — Break-even revenue progress (month to date)

| Field | Value |
|-------|--------|
| **Formula** | `contributionMarginRatio = (netSales − totalVariableCost) / netSales` for MTD; `bepRevenue = monthlyFixedOverhead / contributionMarginRatio` when ratio > 0; `progressPct = min(netSales / bepRevenue, 1.5) × 100` for gauge |
| **Inputs** | `merchants.monthly_fixed_overhead` (admin-editable); same net sales and variable cost as M-1/M-2 aggregates |
| **Decision** | Know if the month is on track to cover rent/payroll/utilities |
| **Threshold** | Caption warning if MTD `progressPct < (daysElapsed/daysInMonth)×100 − 10` |
| **Empty state** | Fixed overhead null/zero → prompt admin to configure overhead strip |
| **Visualization** | Amicro **`mono-rounded-gauge-arc`** + Metric Tile with `$` BEP target |

### M-4 — Break-even portions (MTD auxiliary)

| Field | Value |
|-------|--------|
| **Formula** | `avgContributionPerPortion = (netSales − totalVariableCost) / totalMeatPlatePortionsSold`; `bepPortions = monthlyFixedOverhead / avgContributionPerPortion` |
| **Decision** | Translate BEP into “how many arrachera-style plates left this month” |
| **Threshold** | None (informational) |
| **Visualization** | **Metric Tile only** (no chart) |

### M-5 — Waste % (kg)

| Field | Value |
|-------|--------|
| **Formula** | `(sum waste_logs.weight_kg in period) / (sum inventory_movements.quantity where movement_type = 'receipt' and raw material unit_of_measure = 'kilogram' in period) × 100` |
| **Decision** | Trigger trim/grill training, storage checks, supplier quality conversation |
| **Threshold** | Flame Red if **≥ 5%**; green caption if **< 5%** and denominator > 0 |
| **Empty state** | Denominator 0 → “Sin recepciones de carne en kg en el periodo”; numerator 0 with denominator > 0 → show 0% with note “Sin mermas registradas” |
| **Visualization** | **Metric Tile** + Amicro **`mono-rounded-donut`** by `waste_reason` when ≥ 1 waste row in period |

### M-6 — Average ticket

| Field | Value |
|-------|--------|
| **Formula** | `netSales / count(completed orders in period)` |
| **Decision** | Upsell sides/drinks training; delivery vs dine-in mix checks |
| **Threshold** | Optional caption if MTD average ticket drops > 15% vs prior period (same length) when prior data exists |
| **Visualization** | **Metric Tile** + Amicro **`mono-rounded-sparkline`** or **`mono-rounded-kpi`** daily average series |

### M-7 — Ticket time (kitchen)

| Field | Value |
|-------|--------|
| **Formula** | For orders with both timestamps: `minutes = (ready_at − sent_to_kitchen_at) / 60`; report **median** and **p90** |
| **Inputs** | `orders` where timestamps present; include `served` and `completed` (exclude `cancelled`) |
| **Decision** | Open/close grill capacity; investigate bottleneck before meat dries |
| **Threshold** | Flame Red median caption if **p90 > 25 min** or **median > 18 min** (constants in domain) |
| **Empty state** | No qualifying orders → “Sin comandas con tiempos de cocina” |
| **Visualization** | **Metric Tile** (median + p90 caption) + Amicro **`mono-rounded-bar`** daily median series |

### M-8 — Dine-in session heatmap (dead hours)

| Field | Value |
|-------|--------|
| **Formula** | Count `table_sessions_log` rows grouped by `dayOfWeek(closed_at)` × `hour(closed_at)` |
| **Decision** | Schedule Tue/Wed promotions; shift prep |
| **Threshold** | Caption lists lowest 3 hour buckets below 25% of peak bucket count |
| **Empty state** | No sessions → explain completion will populate logs (see FR-6) |
| **Visualization** | Amicro **`mono-rounded-heatmap`** (preferred) or **`mono-activity-green`** with accent overridden to Flame Red scale in wrapper |

### M-9 — Table turnover

| Field | Value |
|-------|--------|
| **Formula** | `sessionsInPeriod / seatingTableCount / daysInPeriod` where `seatingTableCount = merchants.seating_table_count` |
| **Decision** | Seating layout and service speed during peak |
| **Threshold** | Caption if turnover < 0.8 sessions/table/day during last 7 days |
| **Empty state** | `seating_table_count` null → prompt to configure table count |
| **Visualization** | Amicro **`mono-rounded-bar`** comparing turnover by day-of-week |

---

## Deferred metrics (explicit)

| Metric | Reason |
|--------|--------|
| **CAC** | No `marketing_spend` or acquisition channel attribution |
| **LTV** | No customer entity, repeat-visit linkage, or lifespan |
| **Occupancy % (live)** | No active table session state; only completed `table_sessions_log` |
| **Yield % / optimal price** | Already on `/waste`; not duplicated unless admin drill-down link |
| **Inventory on-hand value** | Not a weekly decision metric for this dashboard slice |

---

## Access & UX

### FR-4 — RBAC

Only `admin` reaches `/dashboard` (existing layout gate). Server actions for overhead/table count: admin only.

### FR-5 — Metric Tile alerts

Use DESIGN.md Metric Tile: caption shows threshold band; Flame Red (`#e11d48`) for alert state on Food Cost, Waste, Ticket time.

### FR-6 — Table session logging

On successful `complete_order_and_deduct_inventory` for `service_type = 'dine_in'` with non-null `table_number`, insert one `table_sessions_log` row:

- `opened_at` = `sent_to_kitchen_at` or `created_at`
- `closed_at` = completion time
- `preparation_time_minutes` = rounded ticket time or 0
- `ticket_total` = `total_amount`

Idempotent: do not duplicate if a session row already exists for `order_id` (add optional `order_id` column via migration **or** unique constraint on `(merchant_id, table_number, closed_at)` — prefer **`table_sessions_log.order_id UUID UNIQUE`**).

### FR-7 — Merchant configuration strip

Admin can update `monthly_fixed_overhead` and `seating_table_count` from dashboard header (server action + Zod validation).

---

## Non-functional

### NFR-1 — Performance

Initial dashboard HTML without chart JS; charts via `next/dynamic` (`ssr: false`). See design.md budgets.

### NFR-2 — Caching

Optional TanStack Query for period toggle only if client refetch is used; default server render per navigation. If client queries used: `staleTime: 60_000`, `refetchOnWindowFocus: false`.

### NFR-3 — Charts library

**All charts** MUST use Amicro Mono Charts vendored via CLI. Do not add Recharts/Chart.js directly for parallel chart components; Recharts may appear **only** inside vendored Amicro files (see design.md).

### NFR-4 — i18n

Spanish UI labels on presentation; English code/specs.

---

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Admin sees all M-1–M-9 sections for Last 7 days with seed data | Manual L2 |
| AC-2 | Food Cost % matches hand-calculated fixture from movements + waste + sales | Vitest |
| AC-3 | Contribution ranking order matches fixture for two plates | Vitest |
| AC-4 | BEP revenue math guards division by zero | Vitest |
| AC-5 | Ticket time median/p90 matches fixture timestamps | Vitest |
| AC-6 | `grill_master` redirected away from `/dashboard` | Manual L2 |
| AC-7 | No `@supabase/supabase-js` in `domains/metrics/presentation/` | Grep |
| AC-8 | Each chart component loaded via `next/dynamic` | Code review |
| AC-9 | Only Amicro vendored chart files under `src/components/ui/mono-*` (no second chart lib imports in metrics presentation) | Grep |
| AC-10 | Completing dine-in order creates one `table_sessions_log` row | Manual L3 |
| AC-11 | Waste % shows empty state when no receipts | Manual L2 |
| AC-12 | Flame Red alert on Food Cost when over threshold | Manual L2 |

---

## Resolved decisions (locked)

Human closed **OQ-2**. Implementer must **not** re-open without a new spec patch and human re-approval.

| ID | Decision |
|----|----------|
| OQ-2 | Dashboard period boundaries and day bucketing use **`America/Caracas`** (Venezuela operations) until `merchants.timezone` exists — **not** rolling UTC windows; matches operational waste “today” calendar day |

**Dashboard period timezone constant (until `merchants.timezone`):** `America/Caracas` (e.g. `DASHBOARD_TIMEZONE` in domain).

---

## Open questions (human approval)

| ID | Question | Default if silent |
|----|----------|-------------------|
| OQ-1 | Fixed overhead + table count: dashboard strip vs `/settings` page? | Dashboard strip only (this feature) |
| OQ-3 | Bundle operational `waste_logs` logging UI in same feature or next? | Next feature; dashboard read-only |
