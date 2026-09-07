# Raw Materials Inventory Management (Insumos CRUD)

## Problem

Asadero businesses buy raw supplies in bulk — meats by weight, disposables by count — and need a single place to catalog items, record supplier receipts, and maintain accurate on-hand stock with weighted average cost (WAC) for downstream financial metrics (`docs/metrics.md`).

The current schema (`raw_materials_inventory.stock_kg`) assumes **kilograms only**. Floor reality mixes mass-based and count-based insumos (envases, guantes, cubitos, etc.). This feature delivers full admin CRUD plus stock receiving with dual units of measure and domain-pure WAC.

## Goals

1. **Catalog** — Admin creates/edits/deactivates raw material items with name, optional SKU, unit of measure, and current stock snapshot.
2. **Receiving** — Admin records inward movements (quantity + purchase unit cost); system updates on-hand quantity and WAC.
3. **Dual UoM** — `kilogram` and `unit`, both stored as `DECIMAL(10,3)` with fractional quantities allowed (including half packs).
4. **Hexagonal SRP** — WAC and quantity rules live in `domain/`; Supabase mutations in `infrastructure/`.
5. **Multi-tenant security** — RLS by `merchant_id`; **admin-only writes**; `/inventory` **admin-only** (full block for `grill_master`).

## Bounded context

Use the existing **`src/domains/raw-materials/`** context for catalog + inventory + receiving. Do **not** split a separate `catalog` bounded context — one aggregate root (`RawMaterial`) with receipt movements is sufficient for MVP.

## Roles affected

| Role | This feature (**locked**) |
|------|---------------------------|
| `admin` | Full access: list, create, edit, deactivate, receive stock |
| `grill_master` | **Blocked** from `/inventory` route and all mutations (supersedes `specs/multi-tenant-auth/` AC-9 for this route only) |
| `waiter` | Blocked (unchanged from multi-tenant-auth) |

## Real floor catalog (example display names)

Spanish names as used on the floor — **required in local/dev seed** (not production onboarding):

Carne, Pollo, Cochino, Sal gruesa, Pimienta, Envases, Bolsas, Cubiertos, Toallin, Guantes, Carbón, Aceite, Cubito, Verduras, Mostaza, Mayonesa, Miel, Papel aluminio.

Suggested UoM mapping is documented in [design.md](./design.md#suggested-uom-mapping-floor-catalog). Cubito remains `unit` (bag count); **fractions of a bag are allowed**.

## In scope

- PostgreSQL migration: `unit_of_measure` enum, UoM-agnostic stock column, admin-only RLS, `inventory_movements` audit table
- Domain entities, WAC pure function, Zod validations, Vitest (AAA)
- Application use cases: create, update, deactivate, list, receive stock
- Infrastructure: Supabase repository, server actions, TanStack Query adapters
- Presentation: `/inventory` admin UI (list, create/edit dialog, receive dialog)
- RBAC update: `/inventory` **admin-only**; sidebar nav aligned
- **Required local/dev seed** of the 18 floor items (`supabase/seeds/`, wired for `db reset` / `db seed`) — **not** production onboarding
- `docs/database-schema.md` and `docs/supabase.md` (seed workflow) update (implementer task)

## Out of scope

- Order recipe deduction, waste logging UI, financial dashboard charts, menu items CRUD
- Redesigning `recipe_ingredients.quantity_kg` or `waste_logs.weight_kg` (kg-oriented; count-based insumos may not map 1:1 until a later feature)
- Outbound stock adjustments (waste, sales deduction) — only **receipt** movements in MVP
- Barcode scanning, supplier management, purchase orders
- Auto-seed of the 18 items on **production** merchant onboarding
- Inserting tenant-specific catalog in production migrations for all merchants

## Related documents

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | Functional/non-functional requirements, acceptance criteria, **resolved** decisions |
| [design.md](./design.md) | Flows, data model, migration SQL, ports, UI, seed, performance |
| [tasks.md](./tasks.md) | Ordered implementation tasks with verification tags |
| [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §3 | Product source |
| [specs/multi-tenant-auth/](../multi-tenant-auth/) | Current RBAC matrix (narrowed for `/inventory` only) |
| [DESIGN.md](../../DESIGN.md) | UI tokens and component rules |

## Verification summary

| Slice | Type |
|-------|------|
| WAC, UoM quantity validation, receive-stock domain logic | `vitest` |
| Inventory UI, RLS admin-only writes, RBAC route gate, tenancy smoke, local seed | `manual` (L1–L4 per `docs/verification.md`) |

Feature flag in `feature_list.json`: `verification: automated` (domain-first); manual slices documented in spec and progress journal.

## Approval

Human-approved 2026-09-03 with overrides **OQ-1** (fractional `unit`) and **OQ-7** (required local seed). All other OQs locked to spec defaults. See [requirements.md](./requirements.md#resolved-decisions-locked-2026-09-03).
