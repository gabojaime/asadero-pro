# Requirements — Order Registration & Kitchen Queue

## Functional requirements

### FR-1 — Read active sellable menu (all order-capable roles)

Authenticated users with access to `/orders` or `/kitchen` can load **active** `menu_items` for their `merchant_id`:

- Grouped for UI by `item_kind` / category (meats, drinks, sides) per OQ-1.
- Only `is_active = true`.
- Prices displayed in USD using **`Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' })`** per OQ-10.

Query key: `['menu-items', merchantId]`. Server or client fetch via hexagonal catalog port — presentation does not call Supabase directly.

### FR-2 — Waiter cart (client draft, immutable updates)

On `/orders`, a **waiter** (also **admin** for testing) builds a **draft cart** in client memory until submit:

1. **Required service type choice:** `take_out` (Para llevar) or `delivery` (Delivery). **`dine_in` is not offered in MVP UI** (enum may remain in DB for future use).
2. **Table number:** Not required for takeaway or delivery. `table_number` stays `NULL` for MVP flows. Do not block submit on missing table.
3. **Delivery fields (when `service_type = delivery`):**
   - **Required:** `delivery_fee` numeric input, `>= 0` (allows `0` for promotions).
   - **Optional:** free-text `delivery_zone` label (e.g. "Centro", "Este") for kitchen/dispatch context.
   - **No auto-calculation** from a zones pricing table (no zone CRUD in MVP).
4. **Takeaway:** `delivery_fee` must be `0` (or `NULL` stored as zero); `delivery_zone` must be empty/null.
5. **Fulfillment timing (required):** **Entrega inmediata** (`fulfillment_timing = immediate`) or **Orden posterior** (`fulfillment_timing = scheduled`). Default selection: immediate. When scheduled, waiter must set **ready-by** date/time (customer promised ready/delivery time). See FR-12.
6. **Customer (optional):** first name, last name, phone — may be left blank; submit is not blocked when empty. See FR-14.
7. Add menu lines with quantity ≥ 1.
8. For each **meat plate** line (`item_kind = meat_plate`), user must pick **exactly two sides** from the side catalog per OQ-2.
9. Drinks and other non-meat items do **not** require sides unless OQ-1 defines otherwise.
10. Cart mutations use **immutable** pure functions (spread/map — no `.push()` on shared state) per [docs/conventions.md](../../docs/conventions.md).

Display running totals:

- **Items subtotal** — sum of line subtotals.
- **Delivery fee** — shown when delivery selected.
- **Order total** — `items subtotal + delivery_fee` (same formula persisted as `total_amount`).

All monetary display uses es-ES USD formatting per OQ-10.

### FR-3 — Send to kitchen (persist order)

Primary action: **"Enviar a cocina"** (Spanish UI).

On submit:

1. Validate cart non-empty, service type rules (OQ-3), delivery fee rules, side rules (OQ-2), quantities, active menu IDs.
2. Insert one row in `orders` with:
   - `merchant_id` from session (never client param)
   - `server_id` = current user id
   - `service_type` = `take_out` or `delivery` (MVP)
   - `table_number` = `NULL` (MVP takeaway/delivery)
   - `delivery_fee` = fee amount (0 for takeaway)
   - `delivery_zone` = optional label or `NULL`
   - `status` = **`pending`** (enters kitchen queue)
   - `total_amount` = domain-computed **items subtotal + delivery_fee**
   - `fulfillment_timing` = `immediate` | `scheduled` (FR-12)
   - `ready_by_at` = `NULL` when immediate; required TIMESTAMPTZ when scheduled (stored UTC; captured in merchant local time per OQ-14)
   - Optional `customer_first_name`, `customer_last_name`, `customer_phone` (trimmed or `NULL`)
   - Timestamps per OQ-4 (`sent_to_kitchen_at` set on insert)
3. Insert `order_items` rows with snapshotted `unit_price` and `subtotal`.
4. Insert side rows per OQ-2 (`order_item_sides`).
5. Clear draft cart on success; toast confirmation.

**One comanda per order** (one kitchen ticket per submit).

### FR-4 — Kitchen active queue (grillmaster)

On `/kitchen`, **grill_master** and **admin** see **active** orders for the tenant:

- **Filter:** `status IN ('pending', 'cooking')`.
- **Sort:** domain function **`sortKitchenQueueOrders(orders, now, horizonMinutes)`** (FR-13) — not raw SQL FIFO. Repo may fetch active orders unsorted or with loose `sent_to_kitchen_at` order; **presentation/application applies domain sort** before render.
- Each row shows:
  - Service-type badge: **Para llevar** or **Delivery** (not dine-in for MVP orders).
  - Fulfillment badge: **Inmediato** or **Para las {HH:mm}** (merchant-local clock on scheduled); optional secondary **Para las {date}** when ready-by is not today.
  - For delivery: optional zone label and delivery fee when present.
  - Optional customer line: `{firstName} {lastName}` and/or phone when provided.
  - Waiter name if available.
  - Line items with quantities, **two sides per meat line**.
  - Elapsed time since `sent_to_kitchen_at` or `created_at`.
- UI follows DESIGN.md **Live Order Queue Item** (flat banner, service pill, timer turns Flame Red past threshold — default 20 min).

Query key: **`['active-orders', merchantId]`** per product backlog §4.2.

### FR-5 — Mark as ready

Grillmaster action **"Marcar listo"** on an active order:

1. Updates order `status` to **`served`** (= ready for waiter).
2. Sets `ready_at`.
3. Removes order from active queue query/cache.
4. Uses `useMutation` + **`queryClient.invalidateQueries({ queryKey: ['active-orders', merchantId] })`** at minimum; Realtime may also update peers.

Waiters **cannot** mark ready.

### FR-6 — Real-time kitchen updates (no manual refresh)

When a waiter sends an order, an open `/kitchen` session **must** show the new ticket within **3 seconds** under normal local/network conditions without user refresh.

Implementation: Supabase Realtime `postgres_changes` on `orders` + cache merge / invalidation (OQ-6).

### FR-7 — Role permissions (route + mutation)

| Action | `waiter` | `grill_master` | `admin` |
|--------|----------|----------------|---------|
| View `/orders`, build cart | ✓ | ✓ | ✓ |
| Submit order (send to kitchen) | ✓ | ✓* | ✓ |
| View `/kitchen` active queue | ✗ (redirect) | ✓ | ✓ |
| Mark order ready | ✗ | ✓ | ✓ |
| Cancel order after send | Out of scope | Out of scope | Out of scope |

\*Grillmaster may submit orders for MVP simplicity.

Route guards remain in [specs/multi-tenant-auth/](../multi-tenant-auth/). Database-level mutation policies per OQ-8.

### FR-8 — Hexagonal boundaries

- Domain/application: no React, Next, Supabase, TanStack Query imports.
- Presentation and `src/app/`: no `@supabase/supabase-js`.
- Pages are view containers composing `domains/orders/presentation/*`.

### FR-9 — Local/dev menu seed

Provide SQL seed (wired for `supabase db reset` / seed workflow) with the **example asadero catalog** (OQ-9):

| Category | Items |
|----------|-------|
| Beef (carne) | 1 kg $44; ½ kg $24; ¼ kg $13 |
| Pork belly (cochino) | 1 kg $42; ½ kg $22; ¼ kg $12 |
| Chicken churrasco | 1 kg $27; ½ kg $15; ¼ kg $8 |
| Drinks | Nestea $3.50; Coca-Cola $1.30 |
| Sides (contornos) | yuca, arepas, ensalada rallada |

Seed is **dev/local only** — not auto-inserted for every production merchant.

**Merchant scoping:** `menu_items.merchant_id` is required. Seed must insert **per merchant** using the same idempotent pattern as `supabase/snippets/raw items seed.sql` (`CROSS JOIN merchants` or target fixture merchant id). Document in `docs/supabase.md`.

### FR-10 — Error and empty states

- Empty cart: disable send button; helper copy in Spanish.
- Delivery selected without valid fee field: inline validation (required numeric `>= 0`).
- Empty kitchen queue: calm empty state (Spanish).
- Load/error states for menu and queue per DESIGN.md flat patterns.
- Mutation failures: generic Spanish alert; no stack traces.

### FR-11 — RTL integration tests (UI layer, mocked adapters)

The feature **must** include automated **React Testing Library (RTL)** integration tests that exercise the **presentation + TanStack Query** layer end-to-end for the happy path, **without** live Supabase or Realtime.

| Requirement | Detail |
|-------------|--------|
| Framework | Vitest + `@testing-library/react` + `@testing-library/user-event` + jsdom (repo has Vitest only today — add devDependencies per [design.md § Test strategy](./design.md#test-strategy)) |
| Adapter mocking | **In-memory fake repositories** implementing `MenuCatalogRepository` and `OrderRepository` ports (same pattern as `raw-materials` application tests with `vi.fn()` / shared store). **Do not introduce MSW** unless the repo adopts it project-wide later. |
| What is real | Domain pure functions, application use cases, presentation components, Query hooks/mutations, Spanish UI copy |
| What is mocked | Supabase repos, server actions (delegate to use cases + fakes), `useKitchenOrdersRealtime` (no-op subscribe; rely on mutation `invalidateQueries` or explicit invalidation — same outcome as production cache refresh) |
| Shared store | One in-memory store per test so **waiter submit → kitchen queue → mark ready** can run as a **single scenario** (render both surfaces sequentially or a thin test harness wrapping both views with one `QueryClient`) |
| Scenarios (minimum) | **(A)** Takeaway immediate. **(B)** Delivery + fee/zone. **(C)** Mark ready. **(D)** Scheduled deferred (> horizon) below immediate. **(E)** Scheduled within horizon mixed FIFO with immediate. **(F)** Optional customer fields on ticket + payload |
| Assertions | **UI:** service badge (Para llevar / Delivery), line quantities/names, two sides per meat line, formatted es-ES USD totals. **Payload:** last inserted order in fake repo has correct `service_type`, `delivery_fee`, `delivery_zone`, line items, sides, `total_amount = items subtotal + delivery_fee` |
| Out of RTL scope | Live Realtime <3s (AC-6 manual), RLS (AC-11 manual), RBAC route redirects (AC-9 manual), Cypress/Playwright |

**OQ-6 is unchanged:** RTL simulates cache updates; **real** Supabase Realtime remains manual L2 verification.

### FR-12 — Fulfillment timing at registration (immediate vs scheduled)

Waiter must choose one of two fulfillment modes before send:

| UI (Spanish) | DB `fulfillment_timing` | `ready_by_at` |
|--------------|-------------------------|---------------|
| Entrega inmediata | `immediate` | `NULL` |
| Orden posterior | `scheduled` | Required — customer promised ready/delivery instant |

Rules:

1. **Immediate:** order enters kitchen queue with normal priority tier (FR-13). No ready-by picker shown.
2. **Scheduled:** waiter selects **ready-by** using date + time controls (minimum: at least **5 minutes** after submit `now` in merchant timezone; maximum: **7 calendar days** ahead for MVP — prevents typos far in the future).
3. Order is **sent to kitchen on submit** (`status = pending`, `sent_to_kitchen_at` set) regardless of timing mode — deferred tickets remain visible in Realtime but sort to the **deferred tier** until within horizon (FR-13).
4. **`ready_at`** (existing column) remains **grillmaster mark-ready timestamp only** — do not reuse for customer promise (OQ-13).

Validation (domain + Zod):

- Reject `scheduled` without `readyByAt`.
- Reject `readyByAt` in the past (relative to submit `now` in merchant timezone per OQ-14).
- Reject `readyByAt` **< 5 minutes** after submit `now` (OQ-18b — **minimum lead**).
- Reject `readyByAt` **> 7 calendar days** after submit `now` in merchant timezone (OQ-18 — **maximum window**).
- Reject `immediate` with non-null `readyByAt` (normalize cart on mode switch).

### FR-13 — Kitchen queue priority sort (configurable horizon)

**Horizon `N`:** minutes until `ready_by_at` below which a **scheduled** order is treated like immediate for queue ordering. Default **`N = 45`**. Stored per merchant: **`merchants.kitchen_priority_horizon_minutes`** (OQ-15). Admin may change via SQL / future settings UI; not waiter-editable.

**Pure domain function** (Vitest required):

```typescript
type KitchenSortInput = {
  orders: Order[]; // active only; includes fulfillmentTiming, readyByAt, sentToKitchenAt
  now: Date;
  horizonMinutes: number; // from merchant setting at query time
};

export function sortKitchenQueueOrders(input: KitchenSortInput): Order[];
```

**Definitions** (for `scheduled` orders with non-null `readyByAt`):

- `minutesUntilReady = (readyByAt.getTime() - now.getTime()) / 60_000`
- **Priority tier `urgent`:** `fulfillmentTiming === 'immediate'` **OR** (`scheduled` AND `minutesUntilReady <= horizonMinutes`)
- **Priority tier `deferred`:** `scheduled` AND `minutesUntilReady > horizonMinutes`

**Sort order (stable):**

1. All **`urgent`** tickets first, sorted by **`sentToKitchenAt ASC`** (FIFO among immediates and soon-due scheduled — avoids starving tickets about to become due).
2. Then all **`deferred`** tickets, sorted by **`readyByAt ASC`**, then **`sentToKitchenAt ASC`** as tiebreaker.

**Immediate orders** never use `readyByAt` for tiering (always `urgent`).

**Edge cases:**

- `horizonMinutes` must be ≥ 1; domain clamps or rejects 0 from config (merchant default 45).
- At exact boundary (`minutesUntilReady === horizonMinutes`), treat as **`urgent`** (inclusive).
- Clock skew: sort uses server/application `now` passed into use case (same instant for whole list).

Replace **`sortOrdersChronologically`** as the active-queue ordering for kitchen UI and `listActiveOrders` use case return value. Keep chronological helper only if still useful for tests; kitchen path must call **`sortKitchenQueueOrders`**.

### FR-14 — Optional customer fields on order

Optional at submit (all nullable in DB):

| Field | Column | Validation (when non-empty) |
|-------|--------|----------------------------|
| First name | `customer_first_name` | trim, 1–80 chars |
| Last name | `customer_last_name` | trim, 1–80 chars |
| Phone | `customer_phone` | trim, 7–20 chars, digits/`+`/spaces/hyphens |

Display on kitchen ticket when any value present. **No PII in client logs** beyond order id (NFR-6 unchanged). RLS: same tenant staff SELECT as orders.

## Non-functional requirements

### NFR-1 — Multi-tenant isolation

All order and menu reads/writes scoped by `merchant_id` via RLS (`get_user_merchant_id()`). Manual L4 smoke: merchant A cannot read/update merchant B orders.

### NFR-2 — Immutability

Cart and domain collections updated by returning new arrays/objects. No in-place mutation of React state or Query cache objects.

### NFR-3 — Performance (MVP budgets)

See [design.md § Performance budgets](./design.md#performance-budgets). Summary:

- Kitchen queue LCP: interactive shell < 2.5s on mid-tier mobile.
- Realtime handler must not block main thread > 50ms per event.
- Client list + Realtime for MVP (OQ-11); no SSR streaming requirement.

### NFR-4 — Accessibility

- Tap targets ≥ 44px on mobile (waiter phones).
- `aria-label` on quantity steppers, service-type toggle, delivery fee input, and "Mark ready".
- Timer/status changes announced via visible text (no aria-live required for MVP unless trivial).

### NFR-5 — Language

Code, SQL, specs: English. Product UI strings: Spanish.

### NFR-6 — Observability

Log order submit and mark-ready failures with order id + merchant id (no PII beyond ids in client logs). Optional server `console.error` in infrastructure — no Sentry requirement.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Waiter opens `/orders`, sees seeded menu grouped by category | Manual L2 |
| AC-2 | Adding meat plate without two sides blocks send with Spanish validation | Manual L2 + Vitest |
| AC-3 | Adding drink does not require sides | Manual L2 |
| AC-4 | Cart total updates correctly when quantity changes (items subtotal) | Vitest |
| AC-5 | Send creates `orders` + `order_items` (+ sides) with correct `total_amount` = items + delivery fee | RTL integration + Vitest (use case) + Manual L2 (live DB) |
| AC-6 | New order appears on `/kitchen` without refresh within 3s | **Manual L2 (Realtime only)** — RTL covers invalidation/cache refresh, not live channel latency |
| AC-7 | Kitchen list sorted by **priority tiers** (FR-13), not naive FIFO | RTL integration + Vitest (`sortKitchenQueueOrders`) + Manual L2 |
| AC-8 | Mark ready removes ticket from active queue | RTL integration + Manual L2 |
| AC-9 | RBAC: waiter blocked from `/kitchen`; grillmaster can access | Manual L2 (RBAC regression) |
| AC-10 | Waiter cannot mark ready (UI hidden + mutation rejected) | Manual L2 + RLS |
| AC-11 | Cross-tenant: user A cannot SELECT/UPDATE merchant B orders | Manual L4 |
| AC-12 | `pnpm test` passes domain, application, **and RTL integration** tests | Vitest + RTL |
| AC-13 | `pnpm exec tsc --noEmit` and `pnpm lint` pass | CLI |
| AC-14 | No `@supabase/supabase-js` in `src/app/` or `domains/orders/presentation/` | Grep |
| AC-15 | Kitchen UI matches Live Order Queue Item patterns (flat, service pill, timer) | Manual L2 + DESIGN.md |
| AC-16 | Prices display as USD with es-ES locale (e.g. `44,00 US$` for $44.00) | Manual L2 |
| AC-17 | Waiter must choose Para llevar or Delivery before send; dine-in not shown | Manual L2 |
| AC-18 | Delivery requires manual fee `>= 0`; takeaway persists `delivery_fee = 0` | Manual L2 + Vitest |
| AC-19 | Kitchen ticket shows service badge; delivery orders show zone/fee when set | RTL integration + Manual L2 |
| AC-20 | RTL: takeaway flow — register meat plate with two sides via **Enviar a cocina**; kitchen queue shows Para llevar badge, lines, sides, correct items subtotal and order total | RTL integration |
| AC-21 | RTL: delivery flow — manual fee + optional zone; UI and fake-repo payload show `service_type = delivery`, `delivery_fee`, `total_amount = items + fee` | RTL integration |
| AC-22 | RTL: **Marcar listo** on pending ticket removes it from active kitchen list; fake repo records `status = served` and `ready_at`; pending orders remain until marked ready | RTL integration |
| AC-23 | RTL tests use Spanish UI queries (`Enviar a cocina`, `Para llevar`, `Delivery`, `Marcar listo`) and es-ES USD display assertions | RTL integration |
| AC-24 | Waiter can submit **Entrega inmediata** without ready-by; scheduled requires ready-by; immediate persists `fulfillment_timing = immediate`, `ready_by_at = NULL` | Vitest + RTL + Manual L2 |
| AC-25 | Scheduled order with ready-by **> N minutes** away appears **below** immediate tickets; within **≤ N minutes** sorts with immediates by `sent_to_kitchen_at` | Vitest (`sortKitchenQueueOrders`) + RTL |
| AC-26 | Kitchen ticket shows **Inmediato** or scheduled **Para las HH:mm** badge; optional customer name/phone when set | RTL + Manual L2 |
| AC-27 | Submit with empty customer fields succeeds; non-empty fields persisted on `orders` | Vitest + RTL |
| AC-28 | Realtime: new scheduled (deferred) order appears on `/kitchen` without refresh; sort updates when horizon boundary crossed (manual clock or wait) | Manual L2 (Realtime); Vitest for sort at boundary |

## Approved decisions (2026-09-12)

Human approved all items below. **Implementation may proceed.** Overrides for OQ-3 and OQ-10 replace earlier dine-in-first and en-US recommendations.

### OQ-1 — Catalog modeling (SKU per row + item_kind) — APPROVED

**Chosen:** **Option A** — separate `menu_items` row per SKU with `item_kind` enum.

Columns: `item_kind` (`meat_plate`, `drink`, `side`), optional `protein_group` (`beef`, `pork`, `chicken`), optional `weight_label` (`1kg`, `500g`, `250g`).

Drinks are standalone priced items. Sides are `item_kind = side` with **price 0.00** (included).

### OQ-2 — Two required sides per meat plate — APPROVED

| Sub-question | Chosen |
|--------------|--------|
| Storage | `order_item_sides(order_item_id, side_menu_item_id, slot SMALLINT CHECK (slot IN (1,2)))` |
| Same side twice | **Allowed** |
| Pricing | **Included (free)** — sides at `$0.00` |
| Validation | Domain rejects meat line submit unless exactly 2 slot entries |

### OQ-3 — Service type, takeaway/delivery, delivery fee — APPROVED (OVERRIDE)

**Chosen (override — not dine-in-first):**

| Rule | Decision |
|------|----------|
| Primary business | **Takeaway and delivery**; dine-in not primary MVP path |
| MVP UI service types | **`take_out` and `delivery` required first-class choice** when registering an order |
| `dine_in` | May remain in DB `service_type` enum; **hidden or deprioritized** in waiter UI — not offered in MVP |
| `table_number` | **Not required** for takeaway/delivery; stays optional/nullable |
| Delivery selection | User selects `delivery` service type |
| Delivery cost | **Waiter manually enters fee** at order time; **no auto-calc** from zones pricing table |
| Zone label | Optional free-text `delivery_zone` (e.g. "Centro") for kitchen/ticket context |
| Order total | `total_amount = sum(order_items.subtotal) + delivery_fee` |
| Takeaway | `delivery_fee = 0`; `delivery_zone = NULL` |
| Validation | `delivery` requires `delivery_fee >= 0` (numeric field required); takeaway forces fee zero |
| Kitchen display | One ticket per order; badge Para llevar / Delivery; show zone + fee on delivery tickets |
| Payments | Delivery fee informational + stored only (OQ-7) |

**Schema columns (extend existing `orders`):** `delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00`, `delivery_zone TEXT NULL`. Reuse existing `service_type`; do not add parallel columns.

### OQ-4 — Order lifecycle states — APPROVED

| Phase | Storage | Who |
|-------|---------|-----|
| Draft cart | Client only | Waiter |
| Sent to kitchen | `status = pending` | Waiter submit |
| Cooking | Stay `pending` until ready (no auto `cooking` in MVP) | — |
| Ready ("Mark as Ready") | `status = served` | Grillmaster/admin |
| Paid/closed | `status = completed` | Out of scope |
| Cancel after send | Out of scope for MVP | — |

**Timestamps:** `sent_to_kitchen_at` (on insert), `ready_at` (on mark ready).

**Do not add** enum value `ready`.

### OQ-5 — Kitchen grouping — APPROVED

**One kitchen ticket per order.** Single shared queue per merchant; all grillmasters see the same active list.

### OQ-6 — Realtime strategy — APPROVED

**Option A:** Supabase Realtime `postgres_changes` on `orders` + Query invalidate/patch.

Reconnect banner "Reconectando…"; refetch on `SUBSCRIBED`. Offline: read-only cache; mutations disabled with Spanish message.

### OQ-7 — Payments — APPROVED

**Out of scope.** No payment capture. `total_amount` and `delivery_fee` are informational for waiter/kitchen only.

### OQ-8 — Tenant/role permissions (RLS) — APPROVED

| Operation | Roles |
|-----------|-------|
| SELECT orders/items/sides | All tenant staff |
| INSERT orders + items + sides | `waiter`, `admin` |
| UPDATE status to `served` | `grill_master`, `admin` |
| UPDATE status to `cancelled` | None (cancel out of scope) |
| DELETE | Deny all |

### OQ-9 — Seed data vs admin catalog CRUD — APPROVED

**Local/dev seed only** via `supabase/seeds/` (per-merchant idempotent inserts). **No menu admin UI.**

### OQ-10 — Currency/locale display — APPROVED (OVERRIDE)

**Chosen (override):**

- Storage: `DECIMAL(10,2)` USD (unchanged).
- Display: **`new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' })`**
- Example: `44,00 US$` (not `$44.00` en-US).
- Spanish UI labels; single currency USD for MVP.

Shared helper in presentation layer (see [design.md](./design.md)).

### OQ-11 — Performance (streaming vs client list) — APPROVED

- Waiter `/orders`: client component + menu query.
- Kitchen `/kitchen`: client list + Realtime; optional route skeleton.
- No Suspense streaming per order row for MVP.

### OQ-12 — Schema/migration vs existing model — APPROVED

**Extend existing tables** (no parallel order model):

1. `menu_item_kind` enum + columns on `menu_items`
2. `order_item_sides` table
3. `orders.sent_to_kitchen_at`, `orders.ready_at`
4. **`orders.delivery_fee`, `orders.delivery_zone`** (OQ-3)
5. Role-aware RLS (OQ-8)
6. Realtime publication for `orders`

Update `docs/database-schema.md` after migration lands.

## Approved decisions (2026-09-24) — fulfillment, sort, customer

Human approved **2026-09-24**. **Phase 7 implementation (T48–T58) is unblocked.**

### OQ-13 — Customer promised time vs kitchen ready timestamp — APPROVED

| Concept | Column | Type |
|---------|--------|------|
| Customer promised ready/delivery | **`ready_by_at`** | `TIMESTAMPTZ NULL` |
| Grillmaster marked ready | **`ready_at`** (existing) | unchanged |

Add enum **`order_fulfillment_timing`**: `immediate`, `scheduled`. Column **`orders.fulfillment_timing`** `NOT NULL DEFAULT 'immediate'`.

Constraint (migration): `(fulfillment_timing = 'immediate' AND ready_by_at IS NULL) OR (fulfillment_timing = 'scheduled' AND ready_by_at IS NOT NULL)`.

### OQ-14 — Timezone for scheduled picker — APPROVED

- Store instants as **UTC TIMESTAMPTZ** in Postgres (standard).
- Waiter UI captures **merchant-local** date/time using **`merchants.timezone`** IANA string (e.g. `America/Caracas`), **`NOT NULL DEFAULT 'America/Caracas'`** on new column (OQ-17).
- Conversion at submit: server or use case converts local parts → UTC using merchant timezone (use `Intl` / `@date-fns/tz` or equivalent — implementer choice).
- MVP: single timezone per merchant; no per-user timezone.

### OQ-15 — Kitchen priority horizon configurability — APPROVED

- **`merchants.kitchen_priority_horizon_minutes INT NOT NULL DEFAULT 45`**
- Check: `>= 1 AND <= 480` (8 hours max).
- **Changeable:** admin updates merchant row (SQL seed, Supabase dashboard, or future **merchant settings** UI — UI out of this increment).
- **Not** env-only (user required changeable interval); env override optional for local dev only, production reads DB column.
- Loaded once per kitchen session / active-orders query with merchant profile or dedicated merchant settings read.

### OQ-16 — Optional customer columns — APPROVED

On **`orders`** (extend, no parallel table):

- `customer_first_name TEXT NULL`
- `customer_last_name TEXT NULL`
- `customer_phone TEXT NULL`

All optional; no composite "customer" entity for MVP.

### OQ-17 — Default merchant IANA timezone — APPROVED

- **`merchants.timezone`** default for new merchants: **`America/Caracas`** (not `America/Bogota`).
- Seed and migrations must use this default; existing merchants backfill to column default on migration.

### OQ-18 — Scheduled ready-by window — APPROVED

| Rule | Value |
|------|--------|
| **Minimum lead** (OQ-18b) | **5 minutes** after submit `now` (merchant timezone) |
| **Maximum horizon** | **7 calendar days** ahead of submit `now` (merchant timezone) |

Domain constants (implementer): e.g. `SCHEDULED_MIN_LEAD_MINUTES = 5`, `SCHEDULED_MAX_DAYS = 7`. Enforced in `validateCartForSubmit` / Zod (FR-12).

## Verification type

**Required:** `verification: automated` in `feature_list.json` — **includes RTL integration**, not domain-only + manual-only for the order/kitchen happy path.

| Slice | Tag |
|-------|-----|
| Cart totals, delivery fee, side validation, status helpers, **`sortKitchenQueueOrders`**, fulfillment validation | `vitest` (node) |
| Waiter submit → kitchen queue → mark ready (UI + Query + fakes) | `rtl` (jsdom) — **required** |
| Live Supabase Realtime latency & reconnect (OQ-6) | `manual` L2 |
| RLS cross-tenant, RBAC browser smoke, seed against live DB | `manual` L3–L4 |

Leader should update `feature_list.json` `notes` for `order-kitchen-queue` to mention **Vitest + RTL integration + manual Realtime/RLS**. Record hybrid breakdown in `progress/order-kitchen-queue.md` when implementation starts (leader/implementer).
