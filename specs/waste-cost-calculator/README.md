# Automated Cooking Waste (Merma) and Cost Calculator

Admin-only tooling to configure **product-level waste percentage (`waste_pct`)** on `meat_plate` menu items, compute **real ingredient cost** after shrinkage, show **recommended retail price** against a target food cost ratio, and **deduct recipe raw weight from inventory when an order is completed** (business §5.2).

Product source: [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §5 (lines 84–100), **refined and approved 2026-09-12**.

## Problem

The asadero sells `meat_plate` SKUs (beef/pork/chicken by portion weight) with prices seeded in `order_menu_catalog.sql`, but:

1. There is **no configurable merma %** per product — admins cannot express that, e.g., beef loses ~30% weight during prep/grill.
2. There is **no cost engine** — `raw_materials_inventory.unit_cost` (WAC) exists, and `recipe_ingredients` exists in schema, but **no rows are seeded** and no UI links plates to protein insumos.
3. `/waste` is a stub and RBAC currently allows `grill_master` (from [specs/multi-tenant-auth/](../multi-tenant-auth/)); the **approved override** requires **admin-only** access to the costing workspace.
4. Business doc §5.2 (inventory deduction on checkout) is **not implemented** — completing an order does not decrement `raw_materials_inventory.quantity_on_hand`.
5. Business doc §5.1 (kg waste event logging) remains **out of scope** for this feature.

After [order-kitchen-queue](../order-kitchen-queue/) (`done`), this feature gives the admin a costing workspace **and** closes the checkout inventory loop without building payments or operational waste logging.

## Goals

1. **Configurable merma % per `meat_plate`** — Admin sets `waste_pct` (0–99.99) per applicable menu item; stored per merchant.
2. **Domain-pure cost formulas** — `calculateYieldPct`, `calculateRealCost`, `calculateOptimalRetailPrice` in `src/domains/waste/domain/` (Vitest, AAA).
3. **Protein link for v1 costing** — One primary `recipe_ingredients` row per meat plate → kilogram-based raw material (`Carne` / `Pollo` / `Cochino` from inventory seed); quantity derived from `weight_label`.
4. **Admin costing UI** on `/waste` — Table of meat plates: current price, WAC, merma %, real cost, recommended price, delta vs current; inline edit merma % and global target food cost %.
5. **Admin-only RBAC for costing** — Route, nav, mutations on merma/target: `admin` only; `grill_master` and `waiter` blocked from `/waste`.
6. **Multi-tenant isolation** — Costing data scoped by `merchant_id`; RLS admin-only on sensitive costing tables/columns.
7. **Inventory auto-deduction on order completion (§5.2)** — When an order transitions to `status = completed`, subtract recipe raw weight from `raw_materials_inventory.quantity_on_hand` using `recipe_ingredients.quantity_kg × order line quantity`. **Merma % does not affect deducted kg** (see reconciliation below).

## OQ-2 vs OQ-8 reconciliation (locked)

These decisions are **not contradictory**:

| Concern | Decision |
|---------|----------|
| **Merma % (`waste_pct`)** | **Costing/pricing input only.** Inflates real cost per kg and recommended retail price via yield formula. |
| **Checkout inventory deduction (§5.2)** | **In scope (OQ-8 override).** Uses recipe **`quantity_kg` (raw weight required)**, never multiplied or divided by `waste_pct` or yield. |
| **What is NOT deducted** | Merma % is **not** the inventory shrink amount. Do not treat `waste_pct` as extra kg to subtract. |

**Formula (deduction):** for each order line with a recipe link:

```
deductedKg = recipe_ingredients.quantity_kg × order_items.quantity
```

Aggregate by `raw_material_id`, then decrement `quantity_on_hand`. Drinks/sides/lines without recipe links are skipped (no deduction, no order failure).

**Formula (costing only):** `realCostPerKg = purchaseCostPerKg / (yieldPct / 100)` where `yieldPct = 100 - waste_pct`.

## Roles affected

| Role | Costing UI (`/waste`) | Order completion → deduction |
|------|----------------------|------------------------------|
| `admin` | Full access: merma %, target food cost %, recommended prices | Can complete served orders → triggers system deduction |
| `waiter` | **Blocked** from `/waste` | Can complete served orders → triggers system deduction (no costing UI) |
| `grill_master` | **Blocked** from `/waste` | **Cannot** complete orders today; marking **Marcar listo** → `served` does **not** deduct inventory |

## Bounded context

**Primary:** `src/domains/waste/` — merma configuration + cost calculation + inventory deduction orchestration ports.

**Integration:** `src/domains/orders/` — minimal order completion path (`served` → `completed`) and hook into completion use case / RPC.

**Read dependency:** `src/domains/raw-materials/` — `quantity_on_hand` updates via SECURITY DEFINER RPC (same pattern as `apply_inventory_receipt`).

Menu catalog CRUD remains out of scope; reads reuse patterns from `src/domains/orders/infrastructure/supabase-menu-catalog-repo.ts`.

## Dependencies

| Feature | Status | Relationship |
|---------|--------|--------------|
| [order-kitchen-queue](../order-kitchen-queue/) | `done` | `menu_items`, order lifecycle through `served`; **`completed` not reachable in UI yet** — this spec adds minimal completion path |
| [raw-materials-inventory](../raw-materials-inventory/) | `done` | WAC on `unit_cost`; canonical stock column `quantity_on_hand`; `inventory_movements` audit |
| [multi-tenant-auth](../multi-tenant-auth/) | `done` | Session, RBAC — **narrowed** for `/waste` admin-only |

## In scope

- Migration: `menu_item_costing`, `merchants.target_food_cost_pct`, admin-only RLS, optional `recipe_ingredients` RLS tightening
- Migration extension: outbound `inventory_movements`, `orders.inventory_deducted_at`, `complete_order_and_deduct_inventory` RPC (or equivalent atomic path)
- Domain formulas + Zod validation for `waste_pct` edges (0, 100, >100, null)
- Domain pure aggregation: `aggregateRecipeDeductions(orderLines, recipes)` — **no merma % in qty**
- Application use cases: costing (admin) + `completeOrder` (waiter/admin) with idempotent deduction
- Infrastructure: Supabase repos, server actions, TanStack Query adapters
- Presentation: `/waste` admin UI; minimal waiter **Completar pedido** on `/orders` for `served` orders (Spanish copy; no payment UI)
- Dev seed: default `waste_pct` + `recipe_ingredients` links for menu seed plates
- RBAC update: `rbac.ts`, `waste/layout.tsx`, sidebar nav
- Vitest for domain/application (costing + deduction); manual for UI + RLS + checkout smoke

## Out of scope

- **Operational waste logging** (§5.1) — grillmaster kg + reason into `waste_logs`; DESIGN.md “Raw Material Waste Input Row” deferred
- **Auto-updating menu sell price** — recommendation display only (OQ-14)
- Full multi-ingredient recipe editor (spices, sides, charcoal allocation)
- Dashboard charts / merma trend analytics
- Menu admin CRUD (future spec)
- Waiter/POS visibility of cost, merma %, or recommended price
- Payment capture, tipping, split bills, receipts
- Full payments spec — completion is “cobrado/cerrado” without payment processor
- `dine_in` table service flows

## Approved decisions (2026-09-12)

All OQ-1–OQ-14 resolved. **Do not reopen without a new spec patch and human re-approval.**

| ID | Decision |
|----|----------|
| OQ-1 | **`menu_item_costing` table** (1:1 `menu_item_id`, admin-only RLS) |
| OQ-2 | Merma % applies **only to cost/price recommendation** — **not** to inventory deduction quantity |
| OQ-3 | `waste_pct` = loss %; `yield = 100 - waste`; `realCostPerKg = purchase / (yield/100)` |
| OQ-4 | **`meat_plate` only in UI**; schema may allow other kinds later |
| OQ-5 | **One `recipe_ingredients` row** per meat plate (v1) |
| OQ-6 | **`merchants.target_food_cost_pct` default `0.33`** |
| OQ-7 | Admin UI at **`/waste` “Merma y costos”** |
| OQ-8 | **OVERRIDE — INCLUDE §5.2 inventory auto-deduction on order `completed` now** |
| OQ-9 | **`waste_logs` kg logging out of scope** |
| OQ-10 | **Recommended price admin-only** on `/waste` |
| OQ-11 | **Admin-only RLS** on `menu_item_costing` |
| OQ-12 | **Automated** domain + deduction use case; **manual** UI/RLS/checkout |
| OQ-13 | Standard **`merchant_id` fence** |
| OQ-14 | **Display recommended price only** — no apply-to-menu |

Full acceptance criteria: [requirements.md](./requirements.md).

## Verification summary

| Slice | Method |
|-------|--------|
| Yield/real cost/optimal price math, validation edges | **Vitest** (domain) |
| Recipe deduction aggregation (no merma %), idempotent complete use case | **Vitest** (domain + application) |
| Use cases with fake repos (admin guard, costing snapshot) | **Vitest** (application) |
| Admin UI, RBAC regression, RLS L4, dev seed smoke, waiter complete → stock down | **Manual** (L2–L4 per `docs/verification.md`) |

Recommended `feature_list.json` verification: **`automated`** (domain-first hybrid).

Suggested `feature_list.json` notes (leader): `OQs locked 2026-09-12; OQ-8 override includes §5.2 deduction on completed; verification automated hybrid (Vitest domain + deduction use case; manual UI/RLS/checkout).`

## Related documents

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | FR/NFR, AC, approved decisions |
| [design.md](./design.md) | Migration, flows, ports, deduction RPC, UI |
| [tasks.md](./tasks.md) | Ordered implementation checklist |
| [DESIGN.md](../../DESIGN.md) | Metric Tile patterns for summary stats (optional) |
| [docs/metrics.md](../../docs/metrics.md) | Food cost % targets (30–35%) |
| [docs/database-schema.md](../../docs/database-schema.md) | Canonical tables (update after migration) |
| [specs/order-kitchen-queue/](../order-kitchen-queue/) | Order status enum and kitchen flow |

## Approval

**Human approved 2026-09-12.** All OQ-1–OQ-14 locked per table above. Leader sets `feature_list.json` to `in_progress` to start implementation.

`progress/waste-cost-calculator.md` is **not** created by spec_author (leader creates on `in_progress`).
