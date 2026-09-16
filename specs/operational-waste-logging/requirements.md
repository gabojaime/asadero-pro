# Requirements — Operational Waste Logging

## Functional requirements

### FR-1 — Log operational waste event

The system SHALL allow authorized staff to create one `waste_logs` row per submit with:

| Field | Source | Rules |
|-------|--------|-------|
| `merchant_id` | Server session | Never from client body |
| `raw_material_id` | User selection | Required; must belong to tenant; **`unit_of_measure = 'kilogram'`** and `is_active = true` |
| `weight_kg` | User input | Required; **> 0**; max **999.999**; 3 decimal places |
| `reason` | User selection | Required; enum **`waste_reason`** (see FR-2) |
| `unit_cost` | System | Snapshot of `raw_materials_inventory.unit_cost` (WAC) at log time |
| `total_cost` | System | Domain: `weight_kg × unit_cost`, rounded **2** decimal places (half-up) |
| `logged_by` | Server session | Authenticated `users.id` |

Submit SHALL be **append-only** (no update/delete in MVP).

### FR-2 — Standardized waste reasons

Reason codes MUST match Postgres enum `waste_reason` ([docs/database-schema.md](../../docs/database-schema.md)):

| DB value | Spanish UI label (suggested) |
|----------|------------------------------|
| `burned_on_grill` | Quemado en parrilla |
| `fat_discarded` | Grasa / recorte descartado |
| `spoiled_raw` | Crudo en mal estado |
| `customer_return` | Devolución de cliente |

No custom/free-text reasons in MVP.

### FR-3 — Inventory impact (physical stock)

Logging waste SHALL represent physical loss:

1. **Decrement** `raw_materials_inventory.quantity_on_hand` by `weight_kg` (same raw material).
2. **Insert** one `inventory_movements` audit row with `movement_type = 'waste_log'`, linking `waste_log_id`, positive `quantity` = kg discarded, `unit_cost` = snapshot WAC, `total_cost` = movement quantity × unit cost.

If `quantity_on_hand` is **less than** requested `weight_kg`:

- RPC **SHALL** still complete the log + movement but cap decrement at available stock (`partial` flag in response); UI **SHALL** show a Spanish warning that on-hand was insufficient. Submit is **not** rejected for insufficient stock (locked decision OQ-2).

WAC on the inventory row SHALL **not** change on waste (only quantity changes).

### FR-4 — Authorization (application + database)

| Action | `admin` | `grill_master` | `waiter` |
|--------|---------|----------------|----------|
| POST log waste | Allow | Allow | **Deny** |
| Read waste history (tenant) | Allow | Allow | Deny |
| Access `/waste-log` route | Allow | Allow | Deny (redirect to default landing) |

`/waste` costing route remains **admin-only** ([waste-cost-calculator](../waste-cost-calculator/)).

### FR-5 — Recent history (shift visibility)

The UI SHALL list waste logs for the **current calendar day** only (not a rolling last-24-hours window). Day boundaries use IANA timezone **`America/Caracas`** (Venezuela operations) until `merchants.timezone` exists (locked decision OQ-5). “Today” means midnight–midnight in that zone for `now` at query time.

Each row displays: timestamp (local), raw material name, `weight_kg`, reason label, `total_cost`, logger display name when available.

Default sort: **newest first**. Limit **50** rows (pagination out of scope).

Empty state when no logs today: Spanish copy indicating nothing recorded yet.

### FR-6 — Raw material picker

Picker SHALL list active raw materials with `unit_of_measure = 'kilogram'` only (meats and kg-tracked insumos). Count-based items excluded per [raw-materials-inventory](../raw-materials-inventory/) recipe/waste kg orientation.

Show current `quantity_on_hand` (read-only hint) next to selected material to reduce over-entry errors.

### FR-7 — Multi-tenant isolation

All reads and writes MUST scope to session `merchant_id`. Cross-tenant `raw_material_id` or forged `merchant_id` MUST fail (RLS + use case guard).

### FR-8 — Query cache invalidation

After successful log, client SHALL invalidate:

- `['operational-waste-logs', merchantId, dayKey]` where `dayKey` is the current calendar date in **`America/Caracas`** (YYYY-MM-DD)
- `['raw-materials', merchantId]` (on-hand changed)

Dashboard metric queries are out of scope until [dashboard-metrics](../dashboard-metrics/) ships; no requirement to invalidate dashboard keys here.

---

## Non-functional requirements

### NFR-1 — Architecture

- Domain layer: no React, Next, Supabase, TanStack Query imports.
- Presentation: no `@supabase/supabase-js`; use query adapters → server actions.
- Extend `src/domains/waste/` rather than a new top-level domain folder.

### NFR-2 — UI (DESIGN.md)

- Reuse **Raw Material Waste Input Row** layout (material label, kg input with unit, reason select, Flame Red submit).
- Flat surfaces, 1px borders, no heavy shadows; weights 300/400/600/700 only.
- Spanish user-facing strings; English code/comments.

### NFR-3 — Performance

- Logging page initial load: target **LCP-friendly** server shell + client form (see [design.md](./design.md)).
- History list for one day (≤50 rows): render < 100ms client-side excluding network.

### NFR-4 — Security

- Atomic log via **SECURITY DEFINER** RPC with explicit role check (`admin`, `grill_master`).
- RLS policy on `waste_logs` INSERT MUST restrict to `admin` and `grill_master` (locked OQ-4; migration required).

---

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | `grill_master` can open `/waste-log`, submit valid log, see it in today’s list | Manual L2 |
| AC-2 | `waiter` navigating to `/waste-log` is redirected away; no nav link | Manual L2 + rbac Vitest |
| AC-3 | `admin` can log and still access `/waste` costing separately | Manual L2 |
| AC-4 | Invalid kg (0, negative, empty) blocked with field errors | Vitest + Manual L2 |
| AC-5 | Missing reason or material blocked | Vitest + Manual L2 |
| AC-6 | `total_cost` matches domain formula for sample WAC/weight | Vitest |
| AC-7 | After log, `quantity_on_hand` decreases by logged kg (or partial decrement + warning when on-hand insufficient) | Manual L3 |
| AC-8 | `inventory_movements` row exists with `movement_type = 'waste_log'` and correct link | Manual L3 |
| AC-9 | Merchant B cannot read merchant A waste rows | Manual L4 |
| AC-10 | Reason dropdown only shows four enum values with Spanish labels | Manual L2 |
| AC-11 | Count-based raw material not offered in picker | Manual L2 |
| AC-12 | Nav shows **“Registrar merma”** vs **“Merma y costos”** without conflating routes | Manual L2 |

---

## Resolved decisions (locked)

Human closed all open questions. Implementer must **not** re-open without a new spec patch and human re-approval.

| ID | Decision |
|----|----------|
| OQ-1 | **`waiter` does not log waste in MVP** — parrillero/admin only; waiter stays on `/orders` |
| OQ-2 | **Insufficient on-hand → partial decrement + warning** (do not reject submit); matches order completion deduction tolerance |
| OQ-3 | Route slug **`/waste-log`** (sibling route; not `/kitchen/merma`) |
| OQ-4 | **Tighten RLS INSERT** on `waste_logs` to `admin` + `grill_master` only (defense in depth with RPC) |
| OQ-5 | History = **calendar day “today”** in **`America/Caracas`** (not rolling 24h). Dashboard period timezone remains per [dashboard-metrics](../dashboard-metrics/) OQ-2 (`America/Mexico_City`) — independent from this feature’s shift/history day |

**Calendar timezone constant (until `merchants.timezone`):** `America/Caracas`.

---

## Proposed `feature_list.json` entry (leader adds)

```json
{
  "id": "operational-waste-logging",
  "title": "Operational Waste Logging (waste_logs)",
  "status": "pending",
  "verification": "automated",
  "notes": "OQs locked. History day: America/Caracas. Source for dashboard Waste % and logged waste cost. Vitest domain/use cases; manual UI/RLS/RPC.",
  "spec": "specs/operational-waste-logging/",
  "spec_path": "specs/operational-waste-logging/",
  "progress_path": "progress/operational-waste-logging.md"
}
```
