# Requirements — Raw Materials Inventory Management

## Functional requirements

### FR-1 — Dual unit of measure on catalog items

Admin creates a raw material with:

| Field | Rule |
|-------|------|
| `name` | Required, trimmed, max 100 chars, unique per merchant among **active** items (OQ-5 locked) |
| `sku` | Optional, trimmed, max 50 chars; **no uniqueness** (OQ-4 locked) |
| `unitOfMeasure` | Required enum: `kilogram` \| `unit` |
| `quantityOnHand` | Non-negative; precision enforced by FR-2 |
| `unitCost` | Non-negative money, 2 decimal places; WAC per UoM |

**UI labels (Spanish):**

| Enum value | Label |
|------------|-------|
| `kilogram` | Kilogramo (kg) |
| `unit` | Unidad (pz/paq) |

UoM change after create is **disallowed** (OQ-2 locked). Implementer must enforce in update use case; no silent migration of historical movements.

### FR-2 — Quantity precision by UoM (**locked: fractional `unit` allowed**)

**Coherent storage rule:** one column `quantity_on_hand DECIMAL(10,3)` for **both** UoM values. Do **not** use integer-only storage or a CHECK that rejects fractions for `unit`. Domain, Zod, UI `step`, WAC rounding, and movement `quantity` all use the same scale (**3 decimal digits**), matching the existing kg column.

| UoM | Storage | Domain / Zod rule | Display | UI `step` |
|-----|---------|-------------------|---------|-----------|
| `kilogram` | `DECIMAL(10,3)` | ≥ 0, max 3 fractional digits | Suffix `kg` | `0.001` |
| `unit` | same `DECIMAL(10,3)` | ≥ 0, max 3 fractional digits; **fractions allowed** (e.g. `0.5` pack) | Suffix `pz` or `un`; show decimals when present | `0.001` (same as kg) |

Fractional packs (e.g. 0.5 pack of cubitos) are **in MVP**. Do **not** reject fractions for `unit`.

### FR-3 — Weighted average cost (domain pure function)

Domain exports an immutable pure function `updateWeightedAverageCost` (exact name required):

**Inputs:** `currentQuantity`, `currentUnitCost`, `incomingQuantity`, `incomingUnitCost`

**Output:** `{ quantityOnHand, unitCost }` — new totals after receipt

**Formula (when valid):**

```
newQuantity = currentQuantity + incomingQuantity
newUnitCost = roundMoney(
  (currentQuantity * currentUnitCost + incomingQuantity * incomingUnitCost) / newQuantity
)
```

**Edge cases (domain must define explicit behavior + Vitest):**

| Case | Behavior |
|------|----------|
| First receipt (`currentQuantity === 0`) | `unitCost = incomingUnitCost`; `quantityOnHand = incomingQuantity` |
| `incomingQuantity <= 0` | Reject with validation error |
| `incomingUnitCost < 0` | Reject with validation error |
| `incomingUnitCost === 0` on first receipt | Allow; WAC becomes `0.00` |
| `incomingUnitCost === 0` with existing stock | WAC unchanged (zero-cost receipt adds qty only) |
| Rounding | Money: round half-up to 2 decimals; **quantity for both UoM:** 3 decimals (`roundQuantityForUom`) |

WAC applies to **both** UoM types — cost is always **per kilogram** or **per unit**, matching the item's `unitOfMeasure`.

Infrastructure **must not** embed WAC math; use cases call domain, then persist.

### FR-4 — Create catalog item (admin)

- Admin-only use case `createRawMaterial`.
- Initial `quantityOnHand` defaults to `0`; `unitCost` defaults to `0.00`.
- Persists row scoped to actor's `merchantId` (never from client input).
- Returns created entity for cache invalidation.

### FR-5 — Update catalog item (admin)

- Admin-only use case `updateRawMaterial`.
- Editable: `name`, `sku`, `isActive` if exposed.
- **Not editable:** `unitOfMeasure` (immutable — OQ-2).
- **Not editable via update form:** `quantityOnHand`, `unitCost` — those change only via receive (FR-6).

### FR-6 — Receive stock (admin inward movement)

- Admin-only use case `receiveStock(rawMaterialId, { incomingQuantity, incomingUnitCost })`.
- Validates incoming fields per FR-2 and FR-3 (fractions allowed for `unit`).
- Computes new `{ quantityOnHand, unitCost }` via `updateWeightedAverageCost`.
- Persists updated inventory row and appends one **inventory movement** audit row (FR-7).
- Sets `last_updated` / domain `updatedAt` on inventory row.

Spanish UI: action label **"Registrar entrada"**; fields **Cantidad**, **Costo unitario de compra**.

### FR-7 — Inventory movement audit (receipts)

Introduce `inventory_movements` table (design.md) because row-only updates are unauditable for supplier receipts. **In scope** (OQ-11 locked).

MVP scope:

- Log **receipt** movements only (`movement_type = 'receipt'`).
- Store: `merchant_id`, `raw_material_id`, `quantity`, `unit_cost`, `recorded_by` (`auth.uid()`), `created_at`.
- Admin can view movement history per item in UI (read-only list in receive dialog or expandable row) — minimal table, no export.

Updating inventory without a movement row is **forbidden** for receive flow.

### FR-8 — List and filter catalog (admin)

- Admin-only route `/inventory` lists all items for tenant (`merchantId` from session).
- Columns: name, SKU (if present), UoM label, quantity on hand (with unit suffix), unit cost (currency + per-UoM hint), last updated.
- Filter: active vs inactive if soft delete (FR-9); default show active only.
- Sort: name ascending default.
- Query key: `['raw-materials', merchantId, filters]`.

Loading and error states required (`isLoading`, `isError`).

### FR-9 — Deactivate catalog item

**Locked:** soft delete via `is_active BOOLEAN NOT NULL DEFAULT true` (OQ-6).

- Admin sets `isActive = false`; item hidden from default list.
- Hard delete **not** exposed in UI (FK from `recipe_ingredients` / `waste_logs`).
- Reactivating inactive items is optional stretch; spec minimum is deactivate only.

### FR-10 — Hexagonal layering

| Layer | Responsibility |
|-------|----------------|
| `domain/` | Entities, `UnitOfMeasure` value object, `updateWeightedAverageCost`, Zod schemas, domain errors |
| `application/` | Use cases; reject non-admin actors before repo calls |
| `infrastructure/` | Supabase repo, server actions, query adapters |
| `presentation/` + `src/app/(app)/inventory/` | Views, dialogs, hooks — **no** `@supabase/supabase-js` |

Follow patterns from `src/domains/auth/` (server action → use case → repo).

### FR-11 — RBAC route and mutation access

**Locked (OQ-3):** full block for grill master — **no** read-only `/inventory` UI.

| Capability | `admin` | `grill_master` | `waiter` |
|------------|---------|----------------|----------|
| Navigate `/inventory` | Allow | **Deny → `/kitchen`** | Deny → `/orders` |
| Sidebar "Inventario" link | Show | **Hide** | Hide |
| Create / update / deactivate / receive | Allow | Deny | Deny |

This **supersedes** `specs/multi-tenant-auth/` AC-9 and FR-8 matrix for `/inventory` only. Implementer updates:

- `src/domains/auth/domain/rbac.ts` (`ROLE_ROUTE_ACCESS`, tests)
- `src/app/(app)/inventory/layout.tsx` (`allowedRoles: ['admin']`)
- `src/domains/auth/presentation/components/app-sidebar.tsx` (via `getNavRoutesForRole`)

**Defense in depth:** use case rejects non-admin even if RLS misconfigured; RLS policies reject non-admin INSERT/UPDATE/DELETE (FR-12).

### FR-12 — RLS (tenant + admin-only writes)

Replace policy `"Admins and Grill Masters can modify inventory"` with:

| Operation | Policy |
|-----------|--------|
| `SELECT` | Authenticated users where `merchant_id = get_user_merchant_id()` |
| `INSERT`, `UPDATE`, `DELETE` | Same tenant **and** `get_user_role() = 'admin'` |

Add `get_user_role()` SECURITY DEFINER helper (stable) reading `public.users.role` for `auth.uid()`.

`inventory_movements`: same pattern — SELECT tenant-wide; INSERT admin-only (receipts).

Cross-tenant access must fail (manual L4).

### FR-13 — Required local/dev seed (18 floor items)

**Locked (OQ-7):** a **required local/dev seed** loads the 18 Spanish floor names with suggested UoM from design.md.

| Environment | Behavior |
|-------------|----------|
| Local `supabase db reset` / `db seed` | **Must** load the 18 items for the seeded local merchant(s) |
| Production migrations | **Must not** INSERT this catalog for every merchant |
| Production onboarding (`create_merchant_and_admin_profile`) | **Must not** auto-insert the 18 items unless a future spec adds a catalog template |

**Acceptance:** after local seed runs against a merchant that exists, those 18 named items exist for that merchant.

**Merchant attachment (do not invent Spanish table names):**

There is no dedicated auth/onboarding seed file today. Seed SQL must:

1. Live under `supabase/seeds/` (e.g. `dev_raw_materials.sql`) and be wired from `supabase/config.toml` `[db.seed]` (and/or `supabase/seed.sql` that includes that file). Document the workflow in `docs/supabase.md`.
2. Attach rows using English tables `merchants` and `raw_materials_inventory`.
3. Be **idempotent**: insert the 18 names for each existing `merchants.id` that does not already have them (match on `merchant_id` + trimmed name).
4. Document QA order: **onboard first** (creates `merchants` + admin `users`), then **re-run seed** (`pnpm dlx supabase db seed` or equivalent) so items attach via `SELECT id FROM merchants`. If `db reset` applies seed before any merchant exists, seed is a no-op for inventory until the second seed pass — that is acceptable **if documented**. Implementer may also seed a local-only English-named merchant **only if** it does not break onboarding; prefer attaching to merchants created by the normal local onboarding path.
5. **Never** put the 18 INSERTs in a production migration.

### FR-14 — Downstream compatibility note

`recipe_ingredients.quantity_kg` and `waste_logs.weight_kg` remain kg-only. Count-based insumos (Envases, Guantes, etc.) **cannot** participate in automatic recipe deduction until a future spec. UI/docs must not imply recipe linking for `unit` items in this feature.

## Non-functional requirements

### NFR-1 — Immutability

Domain and use cases return new objects; no in-place mutation of inventory arrays or entities (`docs/conventions.md`).

### NFR-2 — Language

Code, SQL, comments, specs: English. Product UI strings: Spanish. Table/column names: English only.

### NFR-3 — Performance

| Surface | Budget |
|---------|--------|
| `/inventory` list | < 200 inventory rows without pagination in MVP; simple table, no charts |
| LCP | Not chart-heavy; target < 2.5s mobile for list page |
| Mutations | Single round-trip per create/update/receive (+ movement insert in same transaction preferred) |

No `next/dynamic` required for this page.

### NFR-4 — Accessibility

Forms and dialogs: labels, `role="alert"` on errors, keyboard submit, Flame Red focus ring (`DESIGN.md`).

### NFR-5 — Security

- Never accept `merchantId` from client for writes.
- Generic Spanish error messages; no stack traces.
- Presentation and `src/app/` must not import `@supabase/supabase-js`.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Admin creates kilogram item; appears in list with `kg` suffix | Manual L2 |
| AC-2 | Admin creates unit item; quantity may be fractional (e.g. 0.5) with unit suffix; UI does not force integers | Manual L2 |
| AC-3 | Admin receives stock; quantity and WAC update correctly | Manual L2 |
| AC-4 | Movement row created for each receipt with quantity, cost, `recorded_by` | Manual L2 |
| AC-5 | `updateWeightedAverageCost` Vitest covers first receipt, zero-cost, negative qty rejection, rounding | Vitest |
| AC-6 | UoM quantity validation Vitest: kg and unit both allow up to 3 decimal digits; **unit does not reject 0.5** | Vitest |
| AC-7 | `receiveStock` domain/application helper tests pass (including fractional unit receipt) | Vitest |
| AC-8 | Admin can edit name/SKU; cannot change UoM via UI | Manual L2 |
| AC-9 | Admin can deactivate item; hidden from default list | Manual L2 |
| AC-10 | `grill_master` visiting `/inventory` redirects to `/kitchen` | Manual L2 |
| AC-11 | `grill_master` sidebar does not show Inventario | Manual L2 |
| AC-12 | `waiter` blocked from `/inventory` → `/orders` (unchanged) | Manual L2 |
| AC-13 | Non-admin direct Supabase INSERT on inventory fails (RLS) | Manual L4 |
| AC-14 | Merchant A admin cannot read merchant B inventory | Manual L4 |
| AC-15 | `pnpm exec tsc --noEmit` and `pnpm lint` pass | CLI |
| AC-16 | `inventory/page.tsx` and presentation do not import `@supabase/supabase-js` | Grep |
| AC-17 | `docs/database-schema.md` reflects new columns, enum, movements table, RLS | Review |
| AC-18 | RBAC unit tests updated for admin-only `/inventory` | Vitest |
| AC-19 | After local seed with at least one merchant, the 18 floor items exist for that merchant | Manual (local seed) |

## Resolved decisions (locked 2026-09-03)

Human approved the spec with **two overrides** (OQ-1, OQ-7). Remaining OQs locked to spec defaults. Implementer must **not** re-open these.

### OQ-1 — Count UoM: integer vs decimal packs — **OVERRIDE: fractions ALLOWED**

- Count (`unit`) items **may** have fractional quantities (e.g. 0.5 pack).
- Integer-only proposal **rejected**.
- Coherent rule: `quantity_on_hand DECIMAL(10,3)` for both UoM; domain Zod + UI `step` + WAC rounding use max 3 fractional digits for `unit` as well as `kilogram`. No CHECK that forbids fractions on `unit`.

### OQ-2 — UoM immutable after create — **LOCKED: immutable**

Admin must create a new item to change UoM.

### OQ-3 — Grill master access — **LOCKED: full block**

No read-only `/inventory`. Supersedes multi-tenant-auth AC-9 for this route. Record amendment in progress journal (do not silently rewrite the closed auth spec).

### OQ-4 — Optional SKU — **LOCKED: optional, no uniqueness**

Keep `sku VARCHAR(50)` nullable; show when present.

### OQ-5 — Unique name per merchant — **LOCKED: UNIQUE among active items**

Partial unique index on `(merchant_id, lower(trim(name))) WHERE is_active = true`.

### OQ-6 — Soft delete — **LOCKED: `is_active` deactivate, no hard delete UI**

### OQ-7 — Seed 18 floor items — **OVERRIDE: REQUIRED local/dev seed**

- User: use seed to load the 18 items.
- Production migrations must **not** blindly insert tenant-specific catalog into all merchants.
- Production onboarding **must not** auto-seed unless a future spec adds a template (default: **local/dev only**).
- See FR-13 and AC-19.

### OQ-8 — Cubitos — **LOCKED: `unit` (bag count); fractions allowed via OQ-1**

Do not track cubitos as kg in the seed.

### OQ-9 — Condiments (Mostaza, Mayonesa, Miel, Aceite) — **LOCKED: default `kilogram` in seed**

Admin may create `unit` items if bought by jar/bottle. Seed comments only; not a product rule.

### OQ-10 — Papel aluminio — **LOCKED: default `unit` (roll/box)**

### OQ-11 — Movement history — **LOCKED: `inventory_movements` in scope for receipts**

## Verification type

| Slice | Tag |
|-------|-----|
| WAC, UoM validation, receive-stock domain/application | `vitest` |
| RBAC matrix update for `/inventory` | `vitest` |
| Inventory UI, dialogs, receive flow, deactivate | `manual` |
| RLS admin-only writes, cross-tenant smoke | `manual` |
| Local 18-item seed | `manual` |

Record hybrid results in `progress/raw-materials-inventory.md`.
