# Requirements — Waste Cost Calculator (Merma & Costing)

## Functional requirements

### FR-1 — Admin-only access to costing feature

Only users with `role = 'admin'` may:

1. Navigate to `/waste` (costing workspace).
2. See **Merma y costos** (or approved label) in sidebar navigation.
3. Invoke any mutation related to merma %, target food cost %, or recipe links for costing.

`grill_master` and `waiter` must be **denied** at route gate, excluded from nav, and blocked at use-case + RLS layers for costing mutations.

**Supersedes** [specs/multi-tenant-auth/requirements.md](../multi-tenant-auth/requirements.md) AC-9 `/waste` access for `grill_master` for this feature only (same pattern as `/inventory` admin-only narrowing in raw-materials-inventory).

### FR-2 — List meat plate costing rows (admin)

On `/waste`, admin sees all **active** `menu_items` where `item_kind = 'meat_plate'` for their `merchant_id`, sorted by `protein_group` then `weight_label`.

Each row displays (minimum):

| Column | Source |
|--------|--------|
| Product name | `menu_items.name` |
| Portion label | `menu_items.weight_label` |
| Current sell price | `menu_items.price` |
| Linked protein insumo | `recipe_ingredients` → `raw_materials_inventory.name` |
| Raw material WAC | `raw_materials_inventory.unit_cost` (USD) |
| Recipe qty (kg) | `recipe_ingredients.quantity_kg` |
| Merma % | `menu_item_costing.waste_pct` |
| Yield % | Domain: `calculateYieldPct(wastePct)` |
| Real ingredient cost | Domain: `calculateRealCost(wac, wastePct) * quantityKg` |
| Recommended price | Domain: `calculateOptimalRetailPrice(realCost, targetFoodCostPct)` |
| Delta vs current | `recommendedPrice - currentPrice` (signed) |

Display currency via shared helper: `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' })` (consistent with order-kitchen-queue OQ-10).

Percent fields show explicit `%` suffix per DESIGN.md.

Rows without a recipe link or with zero WAC show a **configuration warning** state (not a crash).

### FR-3 — Configure merma % per meat plate (admin)

Admin can edit **merma %** (`waste_pct`) for each `meat_plate`:

- Valid range: **`0 <= waste_pct < 100`** (100 rejected — division by zero).
- Values `> 100` rejected.
- **`null` / unset** treated as “not configured”; UI prompts admin to set a value before showing recommendation (or shows “—”).
- Default dev seed may pre-fill per protein group (see design.md) until admin overrides.

Mutation persists per merchant; never accepts `merchantId` from client body.

### FR-4 — Global target food cost % (admin)

Admin can view and update **`merchants.target_food_cost_pct`** for their tenant:

- Valid range: **`0 < target_food_cost_pct <= 1`** (e.g. `0.33` = 33% food cost target).
- Default **`0.3300`** on migration for existing merchants.
- Used as denominator in optimal price.

UI: compact settings strip at top of `/waste` (not a separate route).

### FR-5 — Domain cost formulas (pure TypeScript)

Implement in `src/domains/waste/domain/cost-formulas.ts`:

```typescript
/** yield_pct = 100 - waste_pct when waste_pct is configured loss percentage */
calculateYieldPct(wastePct: number): number;

/** realCostPerKg = purchaseCostPerKg / (yieldPct / 100) */
calculateRealCostPerKg(purchaseCostPerKg: number, wastePct: number): number;

/** plateRealCost = realCostPerKg * recipeQuantityKg (single primary ingredient v1) */
calculatePlateRealCost(
  purchaseCostPerKg: number,
  wastePct: number,
  recipeQuantityKg: number,
): number;

/** optimalPrice = totalRealCost / targetFoodCostPct */
calculateOptimalRetailPrice(
  totalRealCost: number,
  targetFoodCostPct: number,
): number;
```

**Approved semantics (OQ-3):** `waste_pct` is **loss percentage of raw weight** (30 means 30% lost, 70% yield).

**Merma % is not used in inventory deduction quantity** (OQ-2 + OQ-8 reconciliation).

Edge cases handled in domain + Zod:

| Input | Behavior |
|-------|----------|
| `waste_pct = 0` | Yield 100%; real cost = purchase cost |
| `waste_pct = 99.99` | Allowed; yield 0.01% |
| `waste_pct = 100` | Validation error |
| `waste_pct > 100` | Validation error |
| Negative | Validation error |
| `targetFoodCostPct = 0` | Validation error |
| Missing recipe / WAC = 0 | UI warning; skip recommendation or show $0.00 with badge |

All functions are pure (no I/O, no rounding side effects beyond explicit `roundMoney` helper if used).

### FR-6 — Primary recipe link for v1 costing (admin read, seed write)

Each `meat_plate` used in costing must have **exactly one primary** `recipe_ingredients` row for MVP v1:

- Links to a **`kilogram`** raw material (protein insumo).
- `quantity_kg` derived from `menu_items.weight_label` (`1kg` → `1.000`, `500g` → `0.500`, `250g` → `0.250`).

**Dev seed** creates links for all seeded meat plates (OQ-5). Admin UI in this slice is **read-only** for recipe links unless human approves inline link editor (defer to menu CRUD spec by default).

Protein mapping for seed (approved):

| `protein_group` | Raw material (dev seed name) |
|-----------------|------------------------------|
| `beef` | Carne |
| `pork` | Cochino |
| `chicken` | Pollo |

The same `recipe_ingredients.quantity_kg` values drive **checkout deduction** (FR-11).

### FR-7 — Non-meat items excluded from costing UI

Drinks (`item_kind = drink`) and sides (`item_kind = side`) are **not listed** in costing UI and **cannot** receive `waste_pct` in this slice.

Future specs may extend costing to other kinds; schema should not prevent it, but UI and validation enforce `meat_plate` only for merma configuration.

### FR-8 — Hexagonal boundaries

- Domain/application: no React, Next, Supabase, TanStack Query imports.
- Presentation and `src/app/`: no `@supabase/supabase-js`.
- Pages are view containers composing `domains/waste/presentation/*` and minimal order completion UI in `domains/orders/presentation/*`.
- Waiter menu catalog (`domains/orders/`) must **not** expose `waste_pct`, WAC, or recommended price (explicit column selection in catalog repo).

### FR-9 — Multi-tenant isolation

- All costing reads/writes filtered by session `merchant_id`.
- Cross-tenant access attempts return empty data or policy violation (RLS L4).
- `menu_item_costing.merchant_id` must match parent `menu_items.merchant_id` (enforced by trigger or application + RLS).
- Inventory deduction updates only `raw_materials_inventory` rows for the order’s `merchant_id`.

### FR-10 — RBAC matrix (this feature)

| Action | `admin` | `grill_master` | `waiter` |
|--------|---------|----------------|----------|
| View `/waste` | ✓ | ✗ → redirect `/kitchen` | ✗ → redirect `/orders` |
| See nav entry “Merma y costos” | ✓ | ✗ | ✗ |
| Read costing rows | ✓ | ✗ | ✗ |
| Update `waste_pct` | ✓ | ✗ | ✗ |
| Update `target_food_cost_pct` | ✓ | ✗ | ✗ |
| View recommended price | ✓ | ✗ | ✗ |
| Complete order (`served` → `completed`) | ✓ | ✗ | ✓ |
| Trigger inventory deduction (system on complete) | ✓ (via complete) | ✗ | ✓ (via complete; **no costing UI**) |
| Log kg waste (`waste_logs`) | Out of scope | Out of scope | Out of scope |

Redirect targets: reuse `resolveRoleRedirect` — `grill_master` → `/kitchen`, `waiter` → `/orders`.

**Grillmaster `served` transition does not deduct stock.** Only **`completed`** triggers deduction (FR-11).

### FR-11 — Inventory auto-deduction on order completion (§5.2, OQ-8 override)

When an order transitions to **`status = 'completed'`**, the system must:

1. **Load order lines** (`order_items` with `menu_item_id`, `quantity`).
2. **Resolve recipe links** (`recipe_ingredients` by `menu_item_id`).
3. **Compute deduction quantities** (domain pure function):

   ```
   perLineKg = recipe_ingredients.quantity_kg × order_items.quantity
   ```

   Aggregate `perLineKg` by `raw_material_id`. **Never** multiply by `waste_pct`, yield, or `(1 + waste_pct/100)`.

4. **Decrement** `raw_materials_inventory.quantity_on_hand` for each affected raw material (canonical column per `docs/database-schema.md`; business doc `current_stock_kg` maps to this column only).
5. **Insert outbound audit rows** into `inventory_movements` with `movement_type = 'order_deduction'` (see design.md).
6. **Set** `orders.inventory_deducted_at` (or equivalent idempotency marker) when deduction succeeds.

**Deduction trigger status:** `order_status = 'completed'` is the sole trigger. **`served` is not checkout** — it means kitchen-ready per [specs/order-kitchen-queue/requirements.md](../order-kitchen-queue/requirements.md) FR-5.

**Minimal completion path (required):** `completed` is defined in the enum ([`src/domains/orders/domain/entities.ts`](../../src/domains/orders/domain/entities.ts)) but **not reachable in UI today** (order-kitchen-queue defers payment/`completed`). This feature adds:

- Domain: `completeOrder(order, now)` — only from `served` → `completed`; reject `pending`, `cooking`, `cancelled`, already `completed`.
- Waiter/admin UI on `/orders`: list or badge for **`served`** orders with action **“Completar pedido”** (Spanish; no payment capture).
- Application use case + SECURITY DEFINER RPC for atomic status update + stock movement (inventory UPDATE is admin-only at RLS today).

**Who completes:** `waiter` and `admin`. **System action** — waiters do not see merma or costing; they only fire completion which invokes deduction.

**Idempotency:** Completing the same order twice (or retrying after success) must **not** double-subtract. Enforced by:

- `orders.inventory_deducted_at IS NOT NULL` → no-op success, or
- unique partial index on `inventory_movements(order_id, raw_material_id)` for `order_deduction`, or
- RPC early return when order already `completed` and deducted.

**Insufficient stock:** Order completion **still succeeds**. For each raw material, deduct `min(requestedKg, quantity_on_hand)`, set `quantity_on_hand = max(0, quantity_on_hand - requestedKg)` (clamp — existing CHECK `quantity_on_hand >= 0`). Record **`partial_deduction`** metadata on movement rows (requested vs applied kg). Do **not** block checkout. Aligns with non-negative inventory constraint in raw-materials-inventory.

**Lines without recipe:** Skip deduction for that line; optionally log `skipped_no_recipe` in RPC result metadata. Do not fail the order.

**Drinks/sides:** No `recipe_ingredients` in v1 seed → no deduction (expected).

**Cancelled orders:** Never deduct.

### FR-12 — Domain recipe deduction aggregation (pure TypeScript)

Implement in `src/domains/waste/domain/recipe-deduction.ts` (name illustrative):

```typescript
type RecipeLink = { menuItemId: string; rawMaterialId: string; quantityKg: number };
type OrderLineForDeduction = { menuItemId: string; quantity: number };

aggregateRecipeDeductions(
  lines: OrderLineForDeduction[],
  recipes: RecipeLink[],
): Map<string, number>; // rawMaterialId → totalKg
```

- Pure function; no merma % parameter.
- Vitest: multiple lines same protein, quantity > 1, unlinked menu items ignored.

## Non-functional requirements

### NFR-1 — Security (RBAC + RLS)

- Route gate: `src/app/(app)/waste/layout.tsx` → `allowedRoles={['admin']}` only.
- Use cases reject non-admin actors on costing mutations with `Forbidden` before persistence.
- `menu_item_costing`: admin-only SELECT/INSERT/UPDATE (no DELETE needed — cascade on menu item).
- `merchants.target_food_cost_pct`: admin-only UPDATE for own merchant row.
- Tighten `recipe_ingredients` policies: **admin-only INSERT/UPDATE/DELETE** (SELECT per design.md).
- Order completion RPC: `waiter` and `admin` only; validates `merchant_id` match; uses SECURITY DEFINER for inventory writes (mirrors `apply_inventory_receipt` admin gate bypass pattern inside trusted RPC).

### NFR-2 — Performance

- Costing list is small (≤ ~20 meat SKUs in dev seed). Client fetch + table render is sufficient.
- No charts in this slice.
- Query `staleTime`: 60s default; invalidate on merma/target mutations.
- Completion RPC: single round-trip; acceptable for MVP order volume.

### NFR-3 — Testability

- Domain formulas and deduction aggregation: Vitest (AAA).
- Application: in-memory fake repos for admin guard, costing snapshot, idempotent complete + deduction.

### NFR-4 — Language

- Spec/code/SQL: English.
- UI copy: Spanish (labels e.g. “Merma %”, “Costo real”, “Precio recomendado”, “Completar pedido”).

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Admin opens `/waste` and sees all active `meat_plate` rows with costing columns | Manual L2 |
| AC-2 | Admin updates merma % on a plate; table recalculates real cost and recommended price | Manual L2 |
| AC-3 | Admin updates global target food cost %; all recommendations refresh | Manual L2 |
| AC-4 | `grill_master` navigating to `/waste` redirects to `/kitchen`; nav hides Merma | Manual L2 |
| AC-5 | `waiter` navigating to `/waste` redirects to `/orders` | Manual L2 |
| AC-6 | Non-admin server action / direct Supabase mutation on `menu_item_costing` fails (RLS) | Manual L4 |
| AC-7 | Merchant A cannot read/update merchant B costing rows | Manual L4 |
| AC-8 | Domain: `waste_pct=30`, WAC=$10/kg, qty=1kg → real cost ≈ $14.29 (10/0.7), optimal @ 0.33 ≈ $43.30 | Vitest |
| AC-9 | Domain rejects `waste_pct=100`, negative, and `targetFoodCostPct=0` | Vitest |
| AC-10 | Waiter menu catalog query does not include `waste_pct` or costing fields | Grep + code review |
| AC-11 | `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` pass | CLI |
| AC-12 | No `@supabase/supabase-js` in `src/app/` or `domains/waste/presentation/` | Grep |
| AC-13 | Dev seed: each seeded meat plate has `recipe_ingredients` link + default `waste_pct` | Manual L3 (db reset) |
| AC-14 | UI uses flat DESIGN.md surfaces; numbers show `%` and USD units | Manual L2 |
| AC-15 | Waiter completes a `served` order → status `completed`; `quantity_on_hand` decreases by `recipe.quantity_kg × line qty` (not adjusted by merma %) | Manual L2 + L3 |
| AC-16 | Completing the same order twice does not double-subtract stock | Vitest + Manual L3 |
| AC-17 | Domain aggregation: 2× beef 1/2 kg lines with 0.5 kg recipe → 1.0 kg total deduction for Carne | Vitest |
| AC-18 | Insufficient stock: complete succeeds; `quantity_on_hand` clamps to 0; movement metadata records partial deduction | Manual L3 |
| AC-19 | Grillmaster **Marcar listo** → `served` only; stock unchanged | Manual L2 |
| AC-20 | Merchant A completion does not alter merchant B inventory | Manual L4 |
| AC-21 | `grill_master` cannot invoke order completion action (UI hidden + RPC forbidden) | Manual L2 + L4 |

## Approved decisions (2026-09-12)

Previously “open questions.” **Locked — do not implement alternatives without new approval.**

| ID | Chosen option | Date |
|----|---------------|------|
| OQ-1 | **`menu_item_costing` table** — 1:1 `menu_item_id`, admin-only RLS | 2026-09-12 |
| OQ-2 | Merma % **cost/price recommendation only** — does **not** change deducted kg | 2026-09-12 |
| OQ-3 | `waste_pct` = loss %; `yield = 100 - waste`; `realCostPerKg = purchase / (yield/100)` | 2026-09-12 |
| OQ-4 | **`meat_plate` only in UI**; schema may allow others later | 2026-09-12 |
| OQ-5 | **One `recipe_ingredients` row** per meat plate | 2026-09-12 |
| OQ-6 | **`merchants.target_food_cost_pct` default `0.33`** | 2026-09-12 |
| OQ-7 | Admin UI at **`/waste` “Merma y costos”** | 2026-09-12 |
| OQ-8 | **OVERRIDE — INCLUDE §5.2 inventory deduction on `completed` now** | 2026-09-12 |
| OQ-9 | **`waste_logs` kg logging out of scope** | 2026-09-12 |
| OQ-10 | **Recommended price admin-only** | 2026-09-12 |
| OQ-11 | **Admin-only RLS** on `menu_item_costing` | 2026-09-12 |
| OQ-12 | **Automated** Vitest domain + deduction use case; **manual** UI/RLS/checkout | 2026-09-12 |
| OQ-13 | Standard **`merchant_id` fence** | 2026-09-12 |
| OQ-14 | **Display recommended price only** — no apply-to-menu | 2026-09-12 |

### OQ-2 vs OQ-8 reconciliation (normative)

- **Costing:** `waste_pct` inflates **economic** real cost and recommended price.
- **Inventory:** deduction uses **`recipe_ingredients.quantity_kg × order quantity`** only.
- **Explicit non-rule:** never `deductedKg × (1 + waste_pct/100)` or `deductedKg / (yield/100)`.

## Suggested `feature_list.json` entry (leader)

```json
{
  "id": "waste-cost-calculator",
  "title": "Automated Cooking Waste (Merma) and Cost Calculator",
  "status": "spec_ready",
  "verification": "automated",
  "notes": "Spec approved 2026-09-12. OQs locked. OQ-8 override includes §5.2 deduction on completed (recipe qty only; merma % costing-only). waste_logs OOS. Verification: Vitest domain + deduction use case; manual UI/RLS/checkout.",
  "spec": "specs/waste-cost-calculator/",
  "spec_path": "specs/waste-cost-calculator/",
  "progress_path": "progress/waste-cost-calculator.md"
}
```
