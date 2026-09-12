# Order Registration & Kitchen Queue (Comandas)

End-to-end MVP flow for **waiter order entry** (takeaway/delivery cart + send to kitchen) and **grillmaster kitchen queue** (chronological active tickets, mark ready, real-time updates).

Product source: [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §4 (lines 60–80). Example catalog: [docs/business/menu-example.pdf](../../docs/business/menu-example.pdf) (supporting context).

## Problem

Staff can sign in and navigate to `/orders` and `/kitchen`, but both routes are placeholders. There is no way to:

1. Build a cart from the asadero sellable menu (meats by weight, drinks, required sides).
2. Persist an order with **service type** (takeaway or delivery), optional delivery zone/fee, and waiter.
3. Surface that order immediately in the kitchen queue for grillmasters.
4. Mark orders ready without manual page refresh.

The schema already defines `orders`, `order_items`, and `menu_items` (including `service_type` enum with `dine_in`, `take_out`, `delivery`), and `src/domains/orders/` exists as empty scaffolding. This spec fills that bounded context and replaces the `/kitchen` stub with a live queue.

**Business context (approved 2026-09-12):** Operations are **primarily takeaway and delivery**. Dine-in is not the primary MVP path.

## Goals

1. **Waiter cart** — Select active menu items, configure **two required sides** on each meat plate, choose **Para llevar** or **Delivery**, enter delivery zone (optional) + **manual delivery fee** when delivery, review total (`items subtotal + delivery fee`), **Send to Kitchen**.
2. **Kitchen comanda queue** — Grillmasters see active orders **oldest first** (`created_at ASC`), with service-type badge (Para llevar / Delivery), line items (including sides), delivery fee/zone when relevant, elapsed timer.
3. **Mark as ready** — Transition removes the ticket from the active queue; other roles can see history later (minimal MVP: kitchen list only).
4. **Real-time kitchen updates** — New orders appear on open `/kitchen` without refresh (Supabase Realtime + TanStack Query; see [design.md](./design.md)).
5. **Hexagonal orders domain** — Pure cart/total/status logic in `domain/`; Supabase in `infrastructure/`; no `@supabase/supabase-js` in presentation or `src/app/`.
6. **Multi-tenant isolation** — All reads/writes scoped by `merchant_id` via RLS; role-aware mutations where specified.
7. **Local/dev menu seed** — Example asadero catalog (user-provided prices) for manual QA; not production onboarding.

## Roles affected

| DB role | UI label | Primary surfaces |
|---------|----------|------------------|
| `waiter` | Mesero | `/orders` — cart + send |
| `grill_master` | Parrillero | `/kitchen` — active queue + mark ready |
| `admin` | Administrador | Both routes (supervision); no separate admin-only order admin in MVP |

RBAC routes are **already defined** in [specs/multi-tenant-auth/](../multi-tenant-auth/). This feature implements business logic inside allowed routes only.

## Dependencies

| Feature | Status | Relationship |
|---------|--------|--------------|
| [multi-tenant-auth](../multi-tenant-auth/) | `done` | Session, `merchantId`, RBAC, `/kitchen` stub to replace |
| [merchant-onboarding](../merchant-onboarding/) | `review_pending` | Tenant exists |
| [raw-materials-inventory](../raw-materials-inventory/) | `done` | Unrelated to sellable menu; recipe deduction **out of scope** |

**No menu CRUD feature exists.** MVP uses migration seed + read-only catalog query.

## Bounded context

**`src/domains/orders/`** — orders, order lines, sides on lines, kitchen queue queries, waiter cart.

Optional thin read port for **`menu_items`** can live inside `orders/infrastructure` (catalog adapter) until a dedicated `menu` context is specified.

## In scope

- Schema migration: extend `menu_items`, add side selections, delivery columns on `orders`, optional status/timestamp columns, role-scoped RLS for order mutations
- Domain: cart immutability, line totals, delivery fee in order total, side validation, status transitions, active-queue filter
- Application use cases: list menu, submit order, list active orders, mark order ready
- Infrastructure: Supabase repos, server actions, TanStack Query (`['active-orders', merchantId]`, etc.)
- Realtime subscription adapter for kitchen queue
- Presentation: `/orders` waiter UI (takeaway/delivery first), `/kitchen` queue UI per [DESIGN.md](../../DESIGN.md) **Live Order Queue Item**
- Local/dev seed for example catalog (§ Catalog seed in [design.md](./design.md))
- Vitest for pure domain/application logic **and RTL integration tests** (waiter → kitchen → mark ready; mocked adapters)
- Currency display: USD stored values, **`Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' })`** in UI

## Out of scope

- Payments, checkout, tipping, split bills (delivery fee is stored and displayed only — not payment capture)
- Auto-calculated delivery pricing from zones catalog (no zone CRUD; fee is manually entered)
- Inventory/recipe deduction on order complete (feature 5 in product backlog)
- `table_sessions_log` population and occupancy metrics
- Menu admin CRUD UI (future spec)
- Physical ticket printing, KDS multi-station routing
- Order edit after send, split kitchen stations, waiter "served to table" confirmation UI
- Dine-in as primary waiter flow (`dine_in` may remain in DB enum but is **hidden/deprioritized** in MVP UI)
- Email/SMS notifications
- Cypress/Playwright E2E

## Approved decisions (2026-09-12)

Human approved **OQ-1 through OQ-12**. Full rationale and options history in [requirements.md § Approved decisions](./requirements.md#approved-decisions-2026-09-12).

| ID | Chosen option (summary) |
|----|-------------------------|
| OQ-1 | Separate `menu_items` row per SKU + `item_kind` enum |
| OQ-2 | Two required sides on meat plates; same side twice allowed; sides $0; `order_item_sides` |
| **OQ-3** | **Takeaway + delivery first-class; dine-in hidden in UI; manual delivery fee + optional zone label; no zone pricing table** |
| OQ-4 | Client draft → `pending` on send → `served` = mark ready; no auto `cooking`; cancel out of MVP; `sent_to_kitchen_at` / `ready_at`; no `ready` enum |
| OQ-5 | One comanda per order; shared kitchen queue |
| OQ-6 | Supabase Realtime + TanStack Query invalidation; reconnect banner |
| OQ-7 | Payments out of scope |
| OQ-8 | Waiter/admin INSERT; grill_master/admin mark served; all staff SELECT; no DELETE |
| OQ-9 | Local/dev seed YES; no menu CRUD UI |
| **OQ-10** | **USD storage; display with `Intl` `es-ES` locale (e.g. 44,00 US$)** |
| OQ-11 | Client list + Realtime; no per-row streaming for MVP |
| OQ-12 | Extend existing tables (+ `delivery_fee`, `delivery_zone` on `orders`) |

**Implementation is unblocked** from a spec perspective. Leader sets `feature_list.json` to `spec_ready` (or `in_progress` when work starts).

## Schema extensions (approved)

| Topic | Current schema | This spec |
|-------|----------------|-----------|
| Kitchen "ready" | `order_status` has `served`, not `ready` | **`served` = ready for waiter**; active queue = `pending` \| `cooking` |
| Side choices | Not stored on `order_items` | `order_item_sides` |
| Menu structure | Flat `name` + `price` | Migration adds `item_kind`, grouping fields |
| Delivery | `service_type` enum exists; no fee columns | Add `delivery_fee DECIMAL(10,2)`, optional `delivery_zone TEXT` |
| Service focus | Default `dine_in` | MVP UI: **`take_out` \| `delivery` only**; `table_number` not required |
| Timestamps | Only `created_at`, `updated_at` | `sent_to_kitchen_at`, `ready_at` |
| Order RLS | Any authenticated tenant user can `ALL` on orders | Role-aware policies |
| Draft cart | No DB table | Client-only until submit |

Do **not** invent parallel order tables. Extend existing `orders` / `order_items` / `menu_items`.

## Suggested `feature_list.json` entry (leader adds/updates)

```json
{
  "id": "order-kitchen-queue",
  "title": "Order Registration & Kitchen Queue (Waiter Cart + Comandas)",
  "status": "spec_ready",
  "verification": "automated",
  "notes": "Spec approved 2026-09-12; updated for RTL integration. OQ-1–OQ-12 locked. Hybrid automated: Vitest domain/application + RTL integration (jsdom, fake repos). Manual: real Supabase Realtime (OQ-6), RLS L4, RBAC browser smoke.",
  "spec": "specs/order-kitchen-queue/",
  "spec_path": "specs/order-kitchen-queue/",
  "progress_path": "progress/order-kitchen-queue.md"
}
```

Leader creates `progress/order-kitchen-queue.md` when setting `in_progress`.

## Verification summary

| Slice | Method |
|-------|--------|
| Cart math, delivery fee totals, side rules, status transitions, validations | **Vitest** (domain/application, `node`) |
| Waiter submit → kitchen queue → mark ready (UI layer, Spanish strings, mocked repos/Query) | **RTL integration** — Vitest + `@testing-library/react` + jsdom (**required**) |
| Real Supabase Realtime latency & reconnect (OQ-6) | **Manual** L2 (AC-6) — RTL simulates invalidation only |
| RLS cross-tenant, live seed smoke, RBAC browser regression | **Manual** L3–L4 |

Feature flag: **`verification: automated`**. Leader should sync `feature_list.json` `notes` to reflect **Vitest + RTL integration + manual Realtime/RLS** (see suggested entry above).

RTL integration is **required** for the happy path (register order, queue display, mark ready). It does **not** replace manual Realtime verification.

## Related documents

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | FR/NFR, acceptance criteria, **approved decisions** |
| [design.md](./design.md) | Flows, data model, Realtime, UI, RLS, performance |
| [tasks.md](./tasks.md) | Ordered implementation checklist |
| [DESIGN.md](../../DESIGN.md) | Live Order Queue Item, tokens |
| [docs/database-schema.md](../../docs/database-schema.md) | Canonical tables (update after migration) |
