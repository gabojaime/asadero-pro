# Menu Items CRUD (Sellable Asadero Catalog)

## Problem

The sellable menu (`menu_items`) is loaded only from the local/dev seed [`supabase/seeds/order_menu_catalog.sql`](../../supabase/seeds/order_menu_catalog.sql). Operators cannot add plates, adjust prices, or retire items without editing SQL. Waiters on `/orders` and admins on `/waste` already consume **active** rows filtered by `is_active = true`; there is no admin workspace to manage the catalog.

This feature delivers **full admin CRUD** on the existing `menu_items` table (no parallel catalog, no new category columns). `item_kind` (`meat_plate` | `drink` | `side`) is the sales category.

## Goals

1. **Admin catalog management** — Create, edit, deactivate, and reactivate menu items for the tenant merchant.
2. **Kind-specific fields** — `meat_plate` requires `protein_group` and `weight_label`; `drink` and `side` keep those fields null.
3. **Soft lifecycle** — Deactivate via `is_active = false` only; **no hard DELETE** (FK from `order_items`, `order_item_sides`; CASCADE on `recipe_ingredients` / `menu_item_costing` must not be triggered from the UI).
4. **New bounded context** — `src/domains/menu/` owns catalog mutations and admin list; `src/domains/orders/` keeps a **thin read-only** active catalog adapter for the waiter cart.
5. **Security** — Admin-only route `/menu`, RLS INSERT/UPDATE for admins (mirror inventory pattern), tenant isolation via `get_user_merchant_id()`.
6. **Cache coherence** — After mutations, invalidate TanStack Query keys used by orders and waste (`['menu-items', merchantId]`, `['meat-plate-costing', merchantId]`).
7. **Hybrid verification** — Vitest for domain Zod/use cases; manual for UI, RBAC, and RLS.

## Bounded context

**Primary:** `src/domains/menu/` — sellable catalog CRUD, validations, admin UI.

**Consumers (unchanged ports, refreshed data):**

| Context | Role |
|---------|------|
| `src/domains/orders/` | `MenuCatalogRepository.listActiveMenu` — active items only for cart/kitchen |
| `src/domains/waste/` | Costing reads active `meat_plate` rows; benefits from invalidation after menu changes |

Do **not** auto-create `recipe_ingredients` or `menu_item_costing` when adding a meat plate — point admins to `/waste` (out of scope for recipe/costing CRUD).

## Roles affected

| Role | This feature (**recommended**) |
|------|--------------------------------|
| `admin` | Full access: `/menu` list, create, edit, deactivate, reactivate |
| `grill_master` | **Blocked** from `/menu` (same pattern as `/inventory`) |
| `waiter` | **Blocked** from `/menu`; continues reading active catalog on `/orders` only |

There is **no** `owner` role in MVP.

## Dependencies

| Feature | Status | Relationship |
|---------|--------|--------------|
| [order-kitchen-queue](../order-kitchen-queue/) | `done` | Defines `menu_items` extensions, cart rules, `['menu-items', merchantId]` key |
| [waste-cost-calculator](../waste-cost-calculator/) | `review_pending` | Reads active `meat_plate`; recipe/costing setup stays on `/waste` |
| [raw-materials-inventory](../raw-materials-inventory/) | `done` | UI/RBAC/RLS patterns to mirror on `/menu` |
| [multi-tenant-auth](../multi-tenant-auth/) | `done` | Session, roles; extend `rbac.ts` with `/menu` |

## In scope

- PostgreSQL migration: admin INSERT/UPDATE RLS on `menu_items`; optional `price >= 0` CHECK; optional partial unique name per merchant among **active** items
- Domain: entities, Zod validations (kind-specific rules), Vitest
- Application: create, update, deactivate, reactivate, list (admin includes inactive)
- Infrastructure: Supabase repo, server actions, query adapters with invalidation of orders + waste keys
- Presentation: `/menu` admin UI (table + dialog), DESIGN.md styling, Spanish copy
- RBAC: `APP_NAV_ROUTES` + `/menu` in `rbac.ts`; sidebar **Menú** after **Inventario**; `RoleRouteGate` admin-only
- `docs/architecture.md` update: `/menu` route and `menu` bounded context (implementer task)
- `docs/database-schema.md` update: RLS policies and constraints (implementer task)

## Out of scope

- Recipe ingredients CRUD, merma %, costing tables, auto-provisioning recipe/costing on create
- Payments, order line name denormalization (`order_items` has no name snapshot — see OQ-8)
- Production onboarding seed of example menu (keep existing `order_menu_catalog.sql` local/dev only)
- New columns: `sort_order`, category tables, images, SKUs, tax flags
- Hard DELETE of `menu_items` from UI or use cases
- Changing how historical tickets display names (FK + live name join only)

## Related documents

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | FR/NFR, acceptance criteria, **open questions** with recommended defaults |
| [design.md](./design.md) | Flows, data model, ports, UI, migration, performance |
| [tasks.md](./tasks.md) | Ordered implementation tasks with verification tags |
| [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) | Product source |
| [DESIGN.md](../../DESIGN.md) | UI tokens and component rules |
| [CHECKPOINTS.md](../../CHECKPOINTS.md) | Definition of done |

## Verification summary

| Slice | Type |
|-------|------|
| Kind-specific Zod, use-case guards, reactivate/deactivate rules | `vitest` |
| RBAC matrix for `/menu` | `vitest` |
| `/menu` UI, dialogs, filters, reactivate | `manual` L1–L2 |
| RLS admin-only writes, cross-tenant | `manual` L4 |
| Waiter `/orders` still loads active catalog after admin edit | `manual` L3 |

Feature flag in `feature_list.json`: `verification: automated` (domain-first); manual slices documented in spec and `progress/menu-items-crud.md`.

## Approval

Spec ready for human review. Implementation starts only after explicit approval and `feature_list.json` status `in_progress`.
