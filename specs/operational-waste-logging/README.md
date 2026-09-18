# Operational Waste Logging (Registro de mermas)

Staff-facing workflow to record **real** raw-material loss at prep/grill time: kilograms discarded, standardized reason, and monetary cost—persisted in `waste_logs`. This is the operational source of truth for dashboard **Waste %** (kg) and the **logged waste cost** portion of **Food Cost %**.

Product source: [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §5.1. UI pattern: [DESIGN.md](../../DESIGN.md) **Component 2: Raw Material Waste Input Row**.

## Product distinction (do not merge)

| Surface | Route (current/planned) | Who | Writes | Purpose |
|---------|-------------------------|-----|--------|---------|
| **Waste cost calculator** | `/waste` — nav **“Merma y costos”** | `admin` only | `menu_item_costing`, recipes, order deduction | Theoretical **merma %** per meat plate, WAC-based real cost, **recommended price** |
| **Operational waste log** (this feature) | **`/waste-log`** — nav **“Registrar merma”** | `admin`, `grill_master` | **`waste_logs`** (+ stock decrement) | Actual kg thrown away + reason at the moment it happens |

These are **separate routes and nav entries**. Do not embed the logging form inside `/waste` or reuse the admin-only `waste` layout gate for grill staff.

Optional cross-links only (e.g. admin sees “Ir a registrar merma” on costing page; logging page links “Ver merma y costos (admin)”).

## Problem

- Business §5.1 requires immutable `waste_logs` rows for operational loss.
- [specs/waste-cost-calculator/](../waste-cost-calculator/) explicitly **excludes** `waste_logs` writes (OQ-9).
- [specs/dashboard-metrics/](../dashboard-metrics/) **reads** `waste_logs` for M-5 Waste % and FR-3 logged waste cost but defers INSERT UI (OQ-3).
- Without this feature, dashboard waste and food-cost metrics stay empty or misleading.

## Goals

1. **Fast floor logging** — Parrillero-friendly inline row: raw material, kg, reason, submit (DESIGN.md waste input row).
2. **Correct cost snapshot** — `unit_cost` = WAC from `raw_materials_inventory` at log time; `total_cost` computed in domain (Vitest).
3. **Inventory truth** — Discarded kg **reduces** `quantity_on_hand` and creates an auditable outbound `inventory_movements` row (atomic RPC).
4. **Recent history** — List today’s logs (calendar day in **`America/Caracas`**, not rolling 24h) so staff confirm entries during the shift.
5. **RBAC + RLS** — `grill_master` and `admin` may log; **`waiter` cannot log in MVP**; RLS INSERT on `waste_logs` restricted to those roles; strict `merchant_id` isolation.
6. **Hexagonal** — Pure validations/use cases in `src/domains/waste/` (extend existing context); Supabase in infrastructure; presentation via query adapters only.

## Roles affected

| Role | Log waste | View history | `/waste` costing |
|------|-----------|--------------|------------------|
| `admin` | Yes | Yes | Yes |
| `grill_master` | Yes | Yes | No (unchanged) |
| `waiter` | **No** (MVP) | No | No |

## Bounded context

**Primary:** extend **`src/domains/waste/`** with operational logging (alongside existing costing/deduction code).

**Read dependencies:**

- `src/domains/raw-materials/` — active catalog, WAC, `unit_of_measure`
- `src/domains/auth/` — session profile, RBAC route table

**Downstream consumers (read-only, separate specs):**

- [specs/dashboard-metrics/](../dashboard-metrics/) — M-5, Food Cost % numerator

## Dependencies

| Feature | Status | Relationship |
|---------|--------|--------------|
| [raw-materials-inventory](../raw-materials-inventory/) | done | WAC, `quantity_on_hand`, `inventory_movements` |
| [multi-tenant-auth](../multi-tenant-auth/) | done | Roles, `RoleRouteGate`, sidebar |
| [waste-cost-calculator](../waste-cost-calculator/) | review_pending | `/waste` admin costing; no `waste_logs` |
| [dashboard-metrics](../dashboard-metrics/) | pending (blocked) | Reads rows this feature writes |

## In scope

- Route **`/waste-log`** with role gate `admin` | `grill_master`
- Sidebar nav entry **“Registrar merma”** (distinct icon/label from “Merma y costos”)
- Domain: waste log input validation, cost calculation, optional stock sufficiency rules
- Application: `logOperationalWaste`, `listOperationalWasteLogsForDay`
- Migration: extend `inventory_movements.movement_type` with `waste_log`; `log_operational_waste` SECURITY DEFINER RPC; tighten RLS INSERT on `waste_logs` (`admin` + `grill_master` only)
- Infrastructure: repository port + server actions + TanStack Query adapters
- Presentation: logging view + today’s history list (Spanish UI copy)
- Vitest for domain/application; manual UI + RLS + RPC smoke

## Out of scope

- Dashboard charts / Food Cost % UI ([dashboard-metrics](../dashboard-metrics/))
- Changing costing formulas or merma % editor on `/waste` (except optional cross-link)
- Edit/delete waste logs (immutable audit trail for MVP)
- Waiter logging (OQ-1 locked: no waiter access in MVP)
- Count-based insumos (`unit_of_measure = 'unit'`) in the waste picker
- Notifications, Realtime subscriptions on waste list
- CAC/LTV, occupancy, payments

## Verification summary

| Slice | Method |
|-------|--------|
| `totalCost = weightKg × unitCost`, validation edges | **Vitest** (domain) |
| Use cases with fake repos (RBAC guard, list filters) | **Vitest** (application) |
| Logging UI, grill_master nav, history, empty/error states | **Manual** (L2) |
| RLS tenant fence, RPC role checks, stock decrement | **Manual** (L3–L4) |

Suggested `feature_list.json` verification: **`automated`** (domain-first hybrid).

## Related documents

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | FR/NFR, AC, **resolved decisions** |
| [design.md](./design.md) | Flows, RPC, UI, performance |
| [tasks.md](./tasks.md) | Implementation checklist |
| [docs/database-schema.md](../../docs/database-schema.md) | `waste_logs`, RLS baseline |
| [docs/metrics.md](../../docs/metrics.md) | Waste % reasons and target |

## Resolved decisions (formerly open questions)

All **OQ-1–OQ-5** are **closed**. Details in [requirements.md](./requirements.md#resolved-decisions-locked).

| ID | Decision |
|----|----------|
| OQ-1 | Waiter **does not** log waste in MVP |
| OQ-2 | Insufficient stock → **partial decrement + warning** (not reject) |
| OQ-3 | Route **`/waste-log`** (not `/kitchen/merma`) |
| OQ-4 | RLS INSERT `waste_logs`: **`admin` + `grill_master` only** |
| OQ-5 | History = calendar **today** in **`America/Caracas`** (not rolling 24h) |

Dashboard [period timezone](../dashboard-metrics/requirements.md) uses **`America/Caracas`** per locked dashboard **OQ-2** — same calendar-day convention as this feature’s **shift/history day** (OQ-5) until `merchants.timezone` exists.

## Approval

Human closed OQs; spec ready for leader to set `spec_ready` / `in_progress`. Leader adds or updates `feature_list.json` entry.

`progress/operational-waste-logging.md` is **not** created by spec_author (leader creates on `in_progress`).
