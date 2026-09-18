# Menu Starter Catalog — Spec Overview

## Problem

New merchants land on `/menu` with no sale items. Today `MenuCatalogView` only shows plain copy (*"No hay ítems en el menú."*) and **Nuevo ítem**. Local dev already has an idempotent SQL seed (`supabase/seeds/order_menu_catalog.sql`), but production tenants have no equivalent **opt-in** path.

Inventory already offers an admin-only starter on empty `/inventory` (`seedStarterRawMaterials`). Menu needs the same pattern: load the asadero example catalog when the tenant has **zero** `menu_items` rows, without auto-onboarding.

## Goals

1. **Opt-in starter menu** on `/menu` when the merchant catalog is completely empty (including inactive rows), admin-only, tenant-scoped, idempotent.
2. **Source of truth** aligned with `order_menu_catalog.sql` via a domain constant + Vitest guard (mirror `raw-materials/domain/starter-catalog.ts`).
3. **UX C (default):** always insert starter `menu_items` (no dependency on inventory). When protein insumos **Carne**, **Cochino**, and **Pollo** exist (active, `kilogram`, normalized name match), also insert `recipe_ingredients` and `menu_item_costing` using the same rules as `waste_cost_calculator.sql`. Otherwise menu-only plus warning + link to `/inventory`.
4. **Cache invalidation** consistent with menu CRUD: `menu-catalog`, `menu-items`, `meat-plate-costing`.

## Roles affected

| Role | Impact |
|------|--------|
| `admin` | Sees empty-state starter CTA on `/menu`; runs seed mutation |
| `grill_master` | No `/menu` access (unchanged) |
| `waiter` | Benefits from populated `/orders` catalog after admin seeds (unchanged) |

## Dependencies

| Feature | Status | Relevance |
|---------|--------|-----------|
| [menu-items-crud](../menu-items-crud/) | `review_pending` (treat as landed) | `/menu` route, CRUD, RLS, invalidation helpers |
| [raw-materials-inventory](../raw-materials-inventory/) | Done | Protein names in starter inventory; `/inventory` starter button |
| [waste-cost-calculator](../waste-cost-calculator/) | Done | FR-6 recipe link rules, default `waste_pct`, `CostingRepository.ensureInferredRecipeIngredient` |

## In scope

- Domain constant `STARTER_MENU_ITEMS` (14 rows) + optional pure helpers for default `waste_pct` by `protein_group`
- Use case `seedStarterMenuCatalog` (admin, idempotent name skip, optional recipe/costing attach)
- Repository extension (`createMany` or equivalent batch insert) on `MenuItemRepository`
- Server action + TanStack Query mutation hook
- `MenuCatalogView` empty state (dashed card, outline starter button, protein callout, link to `/inventory`)
- Vitest: constant sync, use-case matrix (insert, skip duplicates, recipes when proteins present/absent, partial proteins, forbidden non-admin)
- Manual: UI empty state, L3 `/orders` + `/waste`, L4 tenancy / RLS

## Out of scope

- Auto-insert on merchant onboarding (reaffirms menu-items-crud OQ-11)
- Invoking `seedStarterRawMaterials` from `/menu` (link to `/inventory` only unless human overrides OQ-3)
- Waiter / grill_master access to seed
- Hard DELETE of menu rows
- New schema / migrations unless an RLS gap is discovered during implementation
- Changing SQL seed **content** of plates (names, prices, kinds)
- Loading full 18 insumos from `/menu`
- Notion / external task sync

## Documents

| File | Contents |
|------|----------|
| [requirements.md](./requirements.md) | FR/NFR, acceptance criteria, RLS/RBAC, open questions |
| [design.md](./design.md) | Flows, domain ports, UI (DESIGN.md), data model, performance |
| [tasks.md](./tasks.md) | Ordered implementation checklist with verification tags |

## Verification

Hybrid (recorded on feature): **Vitest** for domain constant + seed use case; **manual** for UI, orders catalog, waste costing, RLS L4.
