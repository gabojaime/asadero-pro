# Requirements — Menu Items CRUD

## Functional requirements

### FR-1 — Catalog fields (existing columns only)

Admin manages rows in `menu_items` using **only** these columns:

| DB column | Domain field | Rule |
|-----------|--------------|------|
| `merchant_id` | `merchantId` | Set from session; never from client input |
| `name` | `name` | Required, trimmed, max 255 chars |
| `price` | `price` | Required, ≥ 0, 2 decimal places (sides may be `0.00`) |
| `is_active` | `isActive` | Default `true`; soft lifecycle (FR-9) |
| `item_kind` | `itemKind` | Required enum: `meat_plate` \| `drink` \| `side` — **category** (no separate category table) |
| `protein_group` | `proteinGroup` | `beef` \| `pork` \| `chicken` \| null — see FR-2 |
| `weight_label` | `weightLabel` | Free text portion label (e.g. `1kg`, `500g`) \| null — see FR-2 |
| `created_at` | `createdAt` | Read-only in UI |

**Not in schema (forbidden to invent):** `sort_order`, SKU, description, image URL, tax code, external category FK.

**Immutability (recommended — OQ-4):** `item_kind` is **immutable after create** (same pattern as raw-materials UoM). Admin creates a new item to change kind.

### FR-2 — Kind-specific validation (domain + Zod)

| `item_kind` | `protein_group` | `weight_label` |
|-------------|-----------------|----------------|
| `meat_plate` | **Required** (`beef`, `pork`, or `chicken`) | **Required**, trimmed, max 20 chars (display label) |
| `drink` | Must be `null` | Must be `null` |
| `side` | Must be `null` | Must be `null` |

On create, UI shows protein + weight fields only when kind is `meat_plate`. On edit, kind is read-only; protein/weight remain required for meat plates.

Domain normalizes blank strings to `null` for nullable fields.

### FR-3 — Create menu item (admin)

- Admin-only use case `createMenuItem`.
- Persists INSERT scoped to actor's `merchantId`.
- Does **not** insert `recipe_ingredients` or `menu_item_costing` (FR-14).
- Returns created entity; presentation shows informational callout for new `meat_plate`: configure recipe and merma on **Merma y costos** (`/waste`).

### FR-4 — Update menu item (admin)

- Admin-only use case `updateMenuItem`.
- Editable: `name`, `price`, `protein_group`, `weight_label` (subject to FR-2), `isActive` via dedicated reactivate flow (FR-9).
- **Not editable:** `item_kind` (OQ-4), `merchant_id`, `created_at`.
- Price changes affect **new** orders only; existing `order_items.unit_price` snapshots are unchanged.

### FR-5 — List menu items (admin)

- Admin-only route `/menu` lists **all** items for tenant: active and inactive.
- Default filter: **active only**; toggle **"Mostrar inactivos"** includes deactivated rows.
- Sort: `name` ascending within each `item_kind` group (UI may section by kind — OQ-5).
- Columns (minimum): name, kind (Spanish label), protein/weight (meat plates), price, status badge (Activo / Inactivo), actions (Editar).
- Query key: `['menu-catalog', merchantId, filters]` where `filters` includes `{ activeOnly?: boolean }`.

Loading and error states required (`isLoading`, `isError`).

### FR-6 — Waiter / kitchen active catalog (unchanged behavior)

- `orders` domain continues `listActiveMenu(merchantId)` with `.eq('is_active', true)`.
- No `/menu` access for `waiter` or `grill_master`.
- After admin deactivates an item, it disappears from `/orders` catalog on next fetch/invalidation.

### FR-7 — Hexagonal layering

| Layer | Responsibility |
|-------|----------------|
| `src/domains/menu/domain/` | Entities, Zod schemas, domain errors, repository port |
| `src/domains/menu/application/` | Use cases; reject non-admin actors |
| `src/domains/menu/infrastructure/` | Supabase repo, server actions, query adapters |
| `src/domains/menu/presentation/` | Admin table, form dialog, view |
| `src/app/(app)/menu/` | Thin page + admin `layout.tsx` gate |

Follow patterns from `src/domains/raw-materials/` and auth server actions.

`src/domains/orders/infrastructure/supabase-menu-catalog-repo.ts` remains **read-only** list active; may share row-mapping helper from menu infrastructure but must not import menu application use cases into orders domain layer.

Presentation and `src/app/` must **not** import `@supabase/supabase-js`.

### FR-8 — RBAC route and navigation

**Recommended (OQ-1):** `/menu` is **admin-only**, same as `/inventory`.

| Capability | `admin` | `grill_master` | `waiter` |
|------------|---------|----------------|----------|
| Navigate `/menu` | Allow | Deny → `/kitchen` | Deny → `/orders` |
| Sidebar **Menú** link | Show (after Inventario) | Hide | Hide |
| Create / update / deactivate / reactivate | Allow | Deny | Deny |
| Read active catalog on `/orders` | Allow | Allow | Allow |

Implementer updates:

- `src/domains/auth/domain/rbac.ts` — add `"/menu"` to `AppRoute`, `APP_NAV_ROUTES`, `PROTECTED_APP_ROUTES`, `ROLE_ROUTE_ACCESS` (admin true; others false)
- `src/domains/auth/domain/rbac.test.ts`
- `src/app/(app)/menu/layout.tsx` — `RoleRouteGate route="/menu" allowedRoles={["admin"]}`
- `src/domains/auth/presentation/components/app-sidebar.tsx` — `ROUTE_META`, `ADMIN_NAV_ORDER`: insert `"/menu"` immediately after `"/inventory"`; label **Menú** (Spanish, accent optional in copy only)

### FR-9 — Deactivate and reactivate (soft delete)

**Recommended (OQ-2):** soft delete **only** via `is_active = false`.

- Admin **deactivates** from edit dialog — confirm copy explains item hides from pedidos but history remains.
- Admin **reactivates** inactive items (toggle filter + **Reactivar** action).
- Hard `DELETE` on `menu_items` is **forbidden** in UI, server actions, and use cases (FK on `order_items` / `order_item_sides` without ON DELETE CASCADE).

### FR-10 — RLS (tenant + admin-only writes)

Today: SELECT only for tenant. Add policies mirroring inventory:

| Operation | Policy |
|-----------|--------|
| `SELECT` | Authenticated, `merchant_id = get_user_merchant_id()` (unchanged) |
| `INSERT` | Same tenant **and** `get_user_role() = 'admin'` |
| `UPDATE` | Same tenant **and** `get_user_role() = 'admin'` |
| `DELETE` | **No new admin DELETE policy** — hard delete remains unavailable to app roles |

Use existing `get_user_role()` SECURITY DEFINER helper.

Cross-tenant access must fail (manual L4).

### FR-11 — Optional database constraints (migration)

**Recommended defaults:**

| Constraint | OQ | Recommendation |
|------------|-----|----------------|
| `price >= 0` | OQ-6 | **Add** CHECK on `menu_items.price` |
| Unique name per merchant | OQ-3 | **Add** partial unique index on `(merchant_id, lower(trim(name))) WHERE is_active = true` |

Domain Zod must enforce the same rules before persist for friendly field errors.

### FR-12 — Mutation cache invalidation

On successful create, update, deactivate, or reactivate:

1. Invalidate `['menu-catalog', merchantId, …]` (admin list).
2. Invalidate `['menu-items', merchantId]` — orders waiter catalog (`menuItemsQueryKey` in orders query adapters).
3. Invalidate `['meat-plate-costing', merchantId]` — waste costing snapshot when names/prices/kinds/active flag change.

Implement in menu infrastructure mutations (single place); orders/waste hooks do not need duplicate invalidation logic if menu mutations own it.

### FR-13 — Currency and copy (presentation)

- Spanish UI strings for labels, buttons, errors, empty states.
- Price display and input: **USD** formatted with locale **`es-ES`** (e.g. `13,00 US$` or project-standard — match inventory formatters if present).
- Primary actions use Flame Red accent per DESIGN.md.

### FR-14 — No auto recipe / costing

Creating or editing a `meat_plate` does **not**:

- Insert `recipe_ingredients`
- Insert `menu_item_costing`

UI shows persistent info alert on create/edit meat plate: *"Para descontar inventario y calcular costos, configura la receta en Merma y costos."* with link to `/waste`.

## Non-functional requirements

### NFR-1 — Immutability

Domain and use cases return new objects; no in-place mutation of catalog arrays (`docs/conventions.md`).

### NFR-2 — Language

Code, SQL, comments, specs: English. Product UI strings: Spanish.

### NFR-3 — Performance

| Surface | Budget |
|---------|--------|
| `/menu` list | < 100 rows without pagination in MVP; simple table |
| LCP | Table-only page; target < 2.5s mobile |
| Mutations | Single round-trip per create/update |

See [design.md](./design.md#performance-budgets).

### NFR-4 — Accessibility

Dialogs and forms: associated labels, `role="alert"` on errors, keyboard submit, Flame Red focus ring.

### NFR-5 — Security

- Never accept `merchantId` from client for writes.
- Generic Spanish error messages; no stack traces in UI.
- Defense in depth: use case admin guard + RLS.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Admin creates `meat_plate` with protein + weight + price; appears in list | Manual L2 |
| AC-2 | Admin creates `drink` / `side` without protein/weight; side price may be 0 | Manual L2 |
| AC-3 | Domain validation rejects meat plate missing protein or weight | Vitest |
| AC-4 | Domain validation rejects drink/side with non-null protein or weight | Vitest |
| AC-5 | Admin edits name and price; `/orders` shows updated name/price after invalidation | Manual L2 + L3 |
| AC-6 | Admin deactivates item; hidden from default admin list and from waiter catalog | Manual L2 + L3 |
| AC-7 | Admin shows inactive filter and reactivates item | Manual L2 |
| AC-8 | New meat plate does not create recipe/costing rows | Manual L2 / SQL inspect |
| AC-9 | Create meat plate shows link/callout to `/waste` | Manual L1 |
| AC-10 | `grill_master` visiting `/menu` redirects to `/kitchen` | Manual L2 |
| AC-11 | `waiter` visiting `/menu` redirects to `/orders` | Manual L2 |
| AC-12 | Sidebar: admin sees **Menú** after Inventario; waiter/grill_master do not | Manual L2 |
| AC-13 | Non-admin Supabase INSERT/UPDATE on `menu_items` fails RLS | Manual L4 |
| AC-14 | Merchant A admin cannot read/write merchant B menu items | Manual L4 |
| AC-15 | `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` pass | CLI |
| AC-16 | `/menu` presentation and page do not import `@supabase/supabase-js` | Grep |
| AC-17 | RBAC unit tests cover `/menu` admin-only matrix | Vitest |
| AC-18 | `docs/database-schema.md` documents new RLS and constraints | Review |
| AC-19 | `docs/architecture.md` lists `/menu` and `menu` context | Review |

## Open questions (human approval)

Recommended defaults are **bold**. Implementer should not diverge without leader re-approval.

### OQ-1 — Route access

**Recommendation:** `/menu` **admin-only** (mirror `/inventory`). Waiters continue using `/orders` catalog only.

Alternatives: allow grill_master read-only (rejected — no operational need).

### OQ-2 — Soft delete vs hard delete

**Recommendation:** **Soft delete only** (`is_active = false`); include **reactivate** in admin UI; **no** hard DELETE.

### OQ-3 — Unique name per merchant

**Recommendation:** **Yes** — partial unique index on active items: `(merchant_id, lower(trim(name))) WHERE is_active = true`. Inactive names may duplicate active names only after deactivating the conflicting row.

Alternative: no DB unique; domain-only warning (weaker for concurrent admins).

### OQ-4 — Immutable `item_kind` after create

**Recommendation:** **Immutable** — prevents breaking cart rules, costing filters, and historical semantics. Change kind by creating a new item and deactivating the old one.

### OQ-5 — List grouping

**Recommendation:** Single table with **kind badge** column; optional section headers by `item_kind` (Carnes / Bebidas / Contornos) for scanability — not a separate DB category.

### OQ-6 — Price CHECK constraint

**Recommendation:** **Add** `CHECK (price >= 0)` in migration; domain enforces the same.

### OQ-7 — Route path

**Recommendation:** **`/menu`** (English segment per routing rules); nav label **Menú**.

### OQ-8 — Rename vs historical tickets

**Recommendation:** **Do not denormalize** `order_items.name` in this feature. Historical lines keep `menu_item_id` + snapshotted `unit_price`; display names on old orders may reflect **current** menu name wherever the UI joins live `menu_items.name`. Accept for MVP; document limitation in progress journal.

Future spec may add name snapshot on `order_items` if product requires frozen ticket text.

### OQ-9 — Bounded context split

**Recommendation:** New **`src/domains/menu/`** for CRUD; orders keeps **`MenuCatalogRepository.listActiveMenu`** in orders infrastructure (thin SELECT adapter).

### OQ-10 — Sidebar label

**Recommendation:** Spanish **Menú** (not "Catálogo" or "Carta").

### OQ-11 — Production menu seed

**Recommendation:** **No change** — keep `order_menu_catalog.sql` as local/dev idempotent seed only; do not auto-insert menu on merchant onboarding.

## Verification type

| Slice | Tag |
|-------|-----|
| Zod kind rules, use-case admin guards, deactivate/reactivate | `vitest` |
| RBAC `/menu` matrix | `vitest` |
| Admin UI, dialogs, filters, Spanish copy | `manual` |
| RLS writes, cross-tenant | `manual` |
| Orders catalog regression after mutation | `manual` L3 |

Record hybrid results in `progress/menu-items-crud.md`.
