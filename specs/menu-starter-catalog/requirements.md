# Requirements — Menu Starter Catalog

## Functional requirements

### FR-1 — Starter catalog definition (domain constant)

Define `STARTER_MENU_ITEMS` in `src/domains/menu/domain/starter-catalog.ts` as the **single application source of truth**, kept in sync with `supabase/seeds/order_menu_catalog.sql` via:

- File header comment referencing the SQL seed path
- Vitest asserting **exactly 14** entries and **unique normalized names** (same pattern as `starter-catalog.test.ts` in raw-materials)
- Optional Vitest asserting each entry’s `name` matches the SQL `VALUES` list (order-independent compare)

Each definition row includes:

| Field | Source (SQL seed) |
|-------|-------------------|
| `name` | English display name as in seed |
| `itemKind` | `meat_plate` \| `drink` \| `side` |
| `proteinGroup` | `beef` \| `pork` \| `chicken` \| `null` |
| `weightLabel` | `1kg` \| `500g` \| `250g` \| `null` |
| `price` | Decimal USD as in seed |

All seeded rows use `isActive: true` on insert.

**Do not** maintain a third parallel catalog (no duplicate JSON in presentation).

### FR-2 — Empty catalog detection (UX C)

Show the starter empty state only when the merchant has **zero** `menu_items` rows **including inactive** (same semantics as inventory `catalogIsEmpty`).

| Condition | UI |
|-----------|-----|
| `count(menu_items WHERE merchant_id = session) = 0` | Dashed empty card + starter CTA |
| `count > 0` (even if all inactive) | Normal list / filter behavior; **no** starter button |

Implementation pattern: mirror `InventoryView` — secondary query with `{ activeOnly: false }` enabled only when the primary list has no visible active rows **or** when loading empty-state eligibility; final `menuCatalogIsEmpty` when unrestricted list length is `0`.

### FR-3 — Seed starter menu items (admin, idempotent)

- Use case: `seedStarterMenuCatalog`.
- **Admin-only** via existing `assertAdmin` pattern in menu application layer.
- `merchantId` from session only; never from client body.
- For each starter definition, skip insert when any existing row for the tenant matches `lower(trim(name))` (case-insensitive), regardless of `is_active` — mirrors SQL `WHERE NOT EXISTS`.
- Insert only missing rows; default `is_active = true`.
- **Does not require** `raw_materials_inventory` rows ( `menu_items` FKs only `merchants` ).

Return a structured result (minimum):

| Field | Meaning |
|-------|---------|
| `insertedCount` | New `menu_items` rows |
| `skippedCount` | Definitions skipped due to name match |
| `items` | Created entities (sorted consistently with list use case) |
| `recipesAttachedCount` | New `recipe_ingredients` rows |
| `costingAttachedCount` | New `menu_item_costing` rows |
| `recipesSkippedCount` | Meat plates where protein insumo was unavailable |
| `missingProteinGroups` | Distinct `ProteinGroup` values that blocked recipe link (for UI warning) |

Re-running when catalog is **non-empty** is not exposed in UI; use case should still be safe if invoked (skip all menu inserts).

### FR-4 — Optional recipe + costing attach (starter-only exception)

After menu inserts (and for any **newly inserted** active `meat_plate` rows only in this invocation), attempt to attach costing data **without** blocking menu insert.

**Protein insumo eligibility** (all required):

| Rule | Detail |
|------|--------|
| Name match | Normalized name equals seed mapping (waste FR-6): `beef` → Carne, `pork` → Cochino, `chicken` → Pollo |
| Active | `raw_materials_inventory.is_active = true` |
| UoM | `unit_of_measure = 'kilogram'` |

**Recipe row** (`recipe_ingredients`):

- Skip if a row already exists for `menu_item_id` (idempotent).
- `quantity_kg` from `weight_label`: `1kg` → `1.000`, `500g` → `0.500`, `250g` → `0.250` (reuse `parseWeightLabelToKg` / `inferRecipeLinkForMeatPlate` from waste domain where possible).

**Costing row** (`menu_item_costing`):

- Skip if a row already exists for `menu_item_id` (idempotent — do not overwrite admin-edited `waste_pct`).
- Default `waste_pct` by `protein_group`: beef `30.00`, pork `25.00`, chicken `20.00` (match `waste_cost_calculator.sql`).

**Drinks and sides:** never receive recipe or costing rows.

**Partial proteins (OQ-5 default):** attach recipes/costing only for meat plates whose protein insumo is available; collect missing groups for warning. Do not fail the whole operation.

This behavior is an **explicit exception** to menu-items-crud FR-14 (no auto recipe on manual create). It applies **only** to `seedStarterMenuCatalog`.

### FR-5 — Presentation empty state (`/menu`)

When `menuCatalogIsEmpty`:

- Replace plain paragraph with **dashed border card** (mirror `InventoryView`: `rounded-lg border border-dashed border-border p-8 text-center`).
- Primary line: *No hay ítems en el menú* (or equivalent).
- Secondary helper: explain opt-in starter (14 ítems: carnes, bebidas, contornos) — Spanish copy.
- **Primary button:** keep **Nuevo ítem** (unchanged placement relative to inventory pattern).
- **Outline button:** *Cargar menú inicial* (pending label OQ-7); shows loading *Cargando menú…* while mutation pending.
- **Protein callout** (when tenant lacks one or more eligible protein insumos): suggest loading starter inventory on `/inventory` (**Cargar insumos iniciales**) or creating Carne / Cochino / Pollo manually; include `Link` to `/inventory`. Do **not** call inventory seed from `/menu` (default OQ-3).
- **Post-success status:** summarize inserts; if `missingProteinGroups.length > 0`, warning that merma, costing, and checkout deduction stay incomplete until proteins + recipes exist; link `/inventory` and `/waste`.

Follow [DESIGN.md](../../DESIGN.md): Flame Red accent on primary actions, outline variant for starter, font weights 300/400/600/700 only, no `shadow-lg`.

### FR-6 — Hexagonal layering

| Layer | Responsibility |
|-------|----------------|
| `menu/domain/starter-catalog.ts` | Constant + `normalizeMenuItemName` + optional `defaultWastePctForProteinGroup` pure helper |
| `menu/application/` | `seedStarterMenuCatalog`; admin guard; orchestrates menu repo + **injected** `CostingRepository` port (from waste domain) for recipe/costing idempotent writes |
| `menu/infrastructure/` | Server action `seedStarterMenuCatalogAction`, repo `createMany`, query hook `useSeedStarterMenuCatalog` |
| `menu/presentation/MenuCatalogView.tsx` | Empty state UI |

Presentation and `src/app/` must **not** import `@supabase/supabase-js`.

Menu application may import **waste domain** pure helpers (`inferRecipeLinkForMeatPlate`, `proteinGroupToInventoryName`) and the **port interface** `CostingRepository` — not waste infrastructure or React.

Prefer reusing `CostingRepository.ensureInferredRecipeIngredient` and adding `ensureDefaultWastePctIfMissing` (or equivalent) on the same port rather than duplicating Supabase SQL in menu infrastructure.

### FR-7 — RBAC

| Capability | `admin` | `grill_master` | `waiter` |
|------------|---------|----------------|----------|
| See starter empty state / invoke seed | ✓ | ✗ (no `/menu`) | ✗ (no `/menu`) |
| `seedStarterMenuCatalog` use case | ✓ | ✗ forbidden | ✗ forbidden |

Route gate unchanged: `/menu` admin-only per menu-items-crud FR-8.

### FR-8 — RLS and tenant isolation

No new policies expected if menu-items-crud and waste-cost-calculator migrations are applied:

| Table | Seed operation | Policy expectation |
|-------|----------------|-------------------|
| `menu_items` | INSERT | Tenant + `get_user_role() = 'admin'` |
| `recipe_ingredients` | INSERT | Admin write via menu_item tenant subquery |
| `menu_item_costing` | INSERT | Admin-only tenant scoped |

Reads for protein lookup use authenticated session (tenant filter on `raw_materials_inventory`).

Cross-tenant seed attempts must fail (manual L4). No service-role client from browser or server actions for this feature.

### FR-9 — Cache invalidation

On successful seed mutation, invalidate the same keys as menu CRUD FR-12:

1. `['menu-catalog', merchantId, …]`
2. `['menu-items', merchantId]` (orders waiter catalog)
3. `['meat-plate-costing', merchantId]`

Reuse `invalidateMenuConsumers` in `menu/infrastructure/query-adapters.ts`.

### FR-10 — No onboarding auto-seed

Merchant creation / first login must **not** invoke menu seed. Only explicit admin action on empty `/menu` (reaffirms menu-items-crud OQ-11).

## Non-functional requirements

### NFR-1 — Idempotency

Repeated name collisions skip inserts; existing recipe/costing rows are never overwritten.

### NFR-2 — Immutability

Use cases return new result objects; no in-place mutation of catalog arrays (`docs/conventions.md`).

### NFR-3 — Language

Code, SQL references, specs: English. Product UI strings: Spanish.

### NFR-4 — Performance

Single admin action; batch menu insert where possible; recipe/costing loops bounded by ≤ 9 meat plates. See [design.md](./design.md#performance-budgets).

### NFR-5 — Security

Generic Spanish errors on failure; no stack traces in UI. Defense in depth: use case admin guard + RLS.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Admin with zero menu rows sees dashed empty card + *Cargar menú inicial* | Manual L2 |
| AC-2 | Admin with ≥1 menu row (even all inactive) does **not** see starter button | Manual L2 |
| AC-3 | Seed inserts 14 items when catalog empty; second UI exposure N/A; use case skips duplicates by name | Vitest + Manual L2 |
| AC-4 | Seed succeeds with **no** inventory rows (menu-only); warning mentions incomplete costing/deduction | Vitest + Manual L2 |
| AC-5 | With Carne, Cochino, Pollo active kg insumos, seed creates recipe + costing for all meat plates | Vitest + Manual L3 `/waste` |
| AC-6 | With only Carne present, beef plates get recipes; pork/chicken plates skipped with warning | Vitest |
| AC-7 | Drinks/sides never get `recipe_ingredients` or `menu_item_costing` | Vitest |
| AC-8 | Non-admin cannot invoke seed use case | Vitest |
| AC-9 | After seed, `/orders` shows active items (`menu-items` key invalidated) | Manual L3 |
| AC-10 | `STARTER_MENU_ITEMS` length 14 and names match SQL seed list | Vitest |
| AC-11 | Cross-tenant / non-admin RLS INSERT on `menu_items` still enforced | Manual L4 |
| AC-12 | `pnpm test`, `tsc`, `lint` pass | CLI |
| AC-13 | No `@supabase/supabase-js` in menu presentation | Grep |

## Open questions (human approval)

Recommended defaults are **bold**. Implementer must not diverge without leader re-approval.

### OQ-1 — UX variant

**Recommendation:** **C** — always load menu items; conditionally attach recipes/costing; inventory callout + link when proteins missing.

| Variant | Summary |
|---------|---------|
| A | Menu-only + optional callout |
| B | Block menu seed until proteins exist |
| **C** | Menu always; recipes when possible; warn + link inventory |

### OQ-2 — Recipes + costing in this feature

**Recommendation:** **Yes** — starter-only exception to menu-items-crud FR-14, mirroring dev seed pipeline (`order_menu_catalog.sql` → `waste_cost_calculator.sql`).

Alternative: menu-only now; admin runs separate waste seed later (more clicks, worse MVP demo).

### OQ-3 — Invoke inventory seed from `/menu`

**Recommendation:** **Link only** to `/inventory` (and copy mentioning *Cargar insumos iniciales*). Do not call `seedStarterRawMaterials` from menu domain/action.

Alternative: chained “load both” button (scope creep, two-domain mutation from one CTA).

### OQ-4 — Empty catalog definition

**Recommendation:** **Zero rows including inactive** (same as inventory `catalogIsEmpty`).

Alternative: zero **active** only (would show starter while inactive ghosts exist — inconsistent).

### OQ-5 — Partial protein availability

**Recommendation:** **Partial attach + warning** listing missing protein groups / affected plates.

Alternative: all-or-nothing recipe phase (blocks useful beef-only setups).

### OQ-6 — Verification preference

**Recommendation:** Confirm **hybrid** — Vitest for constant + `seedStarterMenuCatalog`; manual for UI, `/orders`, `/waste`, RLS L4 (already recorded on feature).

### OQ-7 — Starter button label (minor)

**Recommendation:** *Cargar menú inicial* (parallel to *Cargar insumos iniciales*).

Alternative: *Cargar carta de ejemplo*.

## Verification type summary

| Slice | Tag |
|-------|-----|
| `STARTER_MENU_ITEMS` sync tests | `vitest` |
| `seedStarterMenuCatalog` guards, idempotency, recipe attach matrix | `vitest` |
| Empty state UI, Spanish copy, links | `manual` |
| Orders catalog + waste costing after seed | `manual` L3 |
| RLS / cross-tenant | `manual` L4 |
