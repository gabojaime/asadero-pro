# Tasks — Order Registration & Kitchen Queue

Ordered vertical slices. Each task fits one implementer session unless noted.

**Status:** Baseline OQ-1–OQ-12 approved **2026-09-12** (shipped). **Phase 7 (2026-09-24 amendment):** OQ-13–OQ-18 approved **2026-09-24** — **T48–T58 unblocked**. Leader sets `in_progress` when implementer starts Phase 7 (or reopens if baseline incomplete).

Tag: `vitest` | `rtl` | `manual` | `both`

---

## Phase 0 — Approval gate (complete)

- [x] **T0** — Human approved OQ-1–OQ-12 (2026-09-12). Overrides: OQ-3 takeaway/delivery + manual delivery fee; OQ-10 es-ES USD. Leader records in `feature_list.json` + creates `progress/order-kitchen-queue.md` when starting. (`manual`)
- [x] **T0b** — Human approved OQ-13–OQ-18 (2026-09-24): `ready_by_at` vs `ready_at`, TIMESTAMPTZ + merchant TZ default **`America/Caracas`**, horizon on `merchants.kitchen_priority_horizon_minutes`, optional customer columns, scheduled window min **5 min** / max **7 days**. Phase 7 unblocked. (`manual`)

---

## Phase 1 — Schema & domain (TDD first)

- [ ] **T1** — Migration `order_kitchen_queue`: `menu_item_kind` enum + `menu_items` columns; `order_item_sides`; `orders.sent_to_kitchen_at`, `orders.ready_at`, **`orders.delivery_fee`**, **`orders.delivery_zone`**; `delivery_fee >= 0` constraint; indexes; Realtime publication for `orders`; role-aware RLS replacing blanket order policies. Apply via `pnpm dlx supabase db reset` or migrate. (`manual`)
- [ ] **T2** — Regenerate Supabase types → `src/shared/infrastructure/database/supabase.types.ts` (`manual`)
- [ ] **T3** — Domain entities + errors in `src/domains/orders/domain/entities.ts`, `errors.ts` — include `MvpServiceType`, `deliveryFee`, `deliveryZone` (`vitest` prep)
- [ ] **T4** — Cart pure functions: `addLineToCart`, `updateLineQuantity`, `removeLine`, `computeItemsSubtotal`, **`computeOrderTotal`**, **`setServiceType`**, `roundMoney` in `domain/cart.ts` (`vitest`)
- [ ] **T5** — Write `domain/cart.test.ts` first (AAA): immutable add/update/remove, items subtotal, **order total with delivery fee**, takeaway clears fee, duplicate line merge with same sides (`vitest`)
- [ ] **T6** — Side + service validation + `validateCartForSubmit` in `domain/validations.ts` (Zod + meat two-side rule + **delivery fee rules**) (`vitest`)
- [ ] **T7** — Write `domain/validations.test.ts`: reject meat without 2 sides; allow drinks; **require delivery fee >= 0 for delivery**; **takeaway rejects non-zero fee**; **no table number required** (`vitest`)
- [ ] **T8** — Status helpers: `isActiveKitchenOrder`, `sortOrdersChronologically`, `markOrderReady` in `domain/order-status.ts` (`vitest`)
- [ ] **T9** — Write `domain/order-status.test.ts`: transitions, forbidden ready on served order (`vitest`)
- [ ] **T10** — Repository ports `MenuCatalogRepository`, `OrderRepository` in `domain/repository.ts` — insert params include delivery fields (`vitest` prep)

---

## Phase 2 — Application & infrastructure

- [ ] **T11** — Use cases: `listMenuItems`, `submitOrder`, `listActiveOrders`, `markOrderReady` with actor role guards; **`submitOrder` persists total_amount = items + delivery_fee** in `application/use-cases.ts` (`vitest`)
- [ ] **T12** — Write `application/use-cases.test.ts` with in-memory fake repos: submit computes total with delivery fee; takeaway fee zero; mark ready rejects waiter (`vitest`)
- [ ] **T13** — `supabase-menu-catalog-repo.ts` — list active menu (`manual` integration)
- [ ] **T14** — `supabase-order-repo.ts` — insert order + items + sides + **delivery_fee/zone**; list active with joins; mark ready (`manual` integration)
- [ ] **T15** — Optional RPC `create_order_with_items` if transaction atomicity needed — document choice in progress journal (`manual`)
- [ ] **T16** — Server actions: `submitOrderAction`, `markOrderReadyAction` (session profile, no client merchantId) (`manual`)
- [ ] **T17** — Query adapters: `useMenuItems`, `useActiveOrders`, `useSubmitOrder`, `useMarkOrderReady`; keys `['menu-items', merchantId]`, `['active-orders', merchantId]` (`manual`)
- [ ] **T18** — `kitchen-realtime.ts` + `useKitchenOrdersRealtime` hook — subscribe + invalidate on change; polling fallback (`manual`)

---

## Phase 3 — Seed & docs

- [ ] **T19** — `supabase/seeds/order_menu_catalog.sql` with example asadero catalog — **per-merchant idempotent** `CROSS JOIN merchants` pattern (`manual`)
- [ ] **T20** — Wire seed in Supabase seed workflow; document merchant scoping in `docs/supabase.md` (`manual`)
- [ ] **T21** — Update `docs/database-schema.md` to reflect migration (including `delivery_fee`, `delivery_zone`) (`manual`)

---

## Phase 4 — Presentation (waiter)

- [ ] **T22** — Install shadcn primitives if missing (`dialog`, `sheet`, `scroll-area`, `badge`, `radio-group` or tabs) into `src/shared/presentation/ui/` (`manual`)
- [ ] **T23** — **`formatMoneyUsdEs`** helper (`Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' })`) + Spanish copy constants (`manual`)
- [ ] **T24** — `MeatPlateSidePicker` modal — two side selects from side menu items (`manual` L1)
- [ ] **T25** — `CartPanel` — lines, qty steppers, **items subtotal + delivery fee + total** (es-ES USD), send button (`manual` L1)
- [ ] **T26** — `MenuCatalogPanel` — grouped meat/drink list with es-ES prices (`manual` L1)
- [ ] **T27** — **`ServiceTypeSelector`** — Para llevar / Delivery required; no dine-in (`manual` L1)
- [ ] **T28** — **`DeliveryDetailsFields`** — optional zone text + required fee numeric (`>= 0`); hidden for takeaway (`manual` L1)
- [ ] **T29** — `OrderRegistryView` — compose service type, delivery fields, menu, cart; wire mutations (`manual` L2)
- [ ] **T30** — Wire `src/app/(app)/orders/page.tsx`; add `loading.tsx` skeleton optional (`manual` L2)

---

## Phase 5 — Presentation (kitchen)

- [ ] **T31** — `KitchenOrderCard` — DESIGN.md Live Order Queue Item layout + **service badge (Para llevar / Delivery)** + zone/fee for delivery + SLA timer coloring (`manual` L1)
- [ ] **T32** — `KitchenQueueView` — FIFO list, empty state, Realtime hook, mark ready mutation (`manual` L2)
- [ ] **T33** — Replace `src/app/(app)/kitchen/page.tsx` stub; optional `loading.tsx` (`manual` L2)
---

## Phase 5.5 — RTL integration tests (required)

Depends on T29 (`OrderRegistryView`), T32 (`KitchenQueueView`), T17 (query adapters). **Not optional.**

- [ ] **T34** — Add RTL devDependencies (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`); extend `vitest.config.ts`: include `src/**/*.integration.test.tsx`, `environmentMatchGlobs` → jsdom for integration files; add `setup-integration.ts` with jest-dom (`rtl`)
- [ ] **T35** — `infrastructure/testing/menu-catalog-fixture.ts` + `in-memory-order-repos.ts`: shared store implementing `MenuCatalogRepository` + `OrderRepository`; export snapshot helpers for payload assertions (`rtl`)
- [ ] **T36** — `presentation/testing/render-with-order-providers.tsx`: `QueryClientProvider` (retry false), `SessionProfile` stub (waiter / grill_master), inject fake repos; stub `useKitchenOrdersRealtime` no-op (`rtl`)
- [ ] **T37** — `order-kitchen-flow.integration.test.tsx` — **takeaway scenario (AC-20):** Para llevar, add meat plate + two sides, **Enviar a cocina**, render kitchen queue with same QueryClient/store; assert Para llevar badge, lines, sides, es-ES USD subtotal/total; assert fake-repo `service_type`, `total_amount`, sides (`rtl`)
- [ ] **T38** — Same file — **delivery scenario (AC-21, AC-19):** Delivery + zone + manual fee; assert UI totals and fake-repo `delivery_fee`, `delivery_zone`, `total_amount = items + fee`; kitchen shows zone/fee (`rtl`)
- [ ] **T39** — Same file — **mark ready (AC-22):** pending ticket in queue → **Marcar listo** → ticket leaves active list; fake-repo `status = served`, `ready_at` set; pending-only filter verified (`rtl`)
- [ ] **T40** — Spanish query conventions + es-ES display assertions documented in test file header (AC-23); `pnpm test` green for domain + application + integration (`both`)

---

## Phase 6 — Verification & review

- [ ] **T41** — Realtime smoke: two browsers — waiter submit (takeaway + delivery), kitchen updates without refresh within 3s (AC-6 manual only — RTL does not replace) (`manual` L2)
- [ ] **T42** — RLS smoke: waiter insert; grillmaster update served; cross-tenant deny (AC-10, AC-11) (`manual` L4)
- [ ] **T43** — RBAC regression: waiter blocked from `/kitchen`; grillmaster can access (`manual` L3)
- [ ] **T44** — Manual pass AC-16 (es-ES USD), AC-17 (service type), AC-18 (delivery fee validation) in live browser (`manual` L2)
- [ ] **T45** — Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (AC-12, AC-13 — includes RTL suite) (`both`)
- [ ] **T46** — Grep: no `@supabase/supabase-js` in presentation/app orders paths (AC-14) (`manual`)
- [ ] **T47** — Append verification table to `progress/order-kitchen-queue.md` (vitest + rtl + manual Realtime/RLS); set feature `review_pending` (`manual`)

---

## Dependency graph (summary)

```
T0 (approved) → T1 migration → T2 types
  → T3–T10 domain (parallel tests)
  → T11–T12 application
  → T13–T18 infrastructure
  → T19–T21 seed/docs
  → T23 formatMoneyUsdEs (early — used by T25–T31)
  → T24–T30 waiter UI (depends T17, T23)
  → T31–T33 kitchen UI (depends T17, T18, T23)
  → T34–T40 RTL integration (depends T29, T32, T17)
  → T41–T47 verification (T41 Realtime manual after RTL T34–T40)
  → T48–T58 Phase 7 increment (OQ-13–OQ-18 approved 2026-09-24)
```

## Phase 7 — Fulfillment timing, kitchen priority sort, customer fields (2026-09-24)

Depends on baseline Phases 1–6 complete. **Approved:** [requirements.md § Approved decisions (2026-09-24)](./requirements.md#approved-decisions-2026-09-24--fulfillment-sort-customer).

- [ ] **T48** — Migration `order_fulfillment_and_kitchen_priority`: enum `order_fulfillment_timing`; `orders.fulfillment_timing`, `ready_by_at`, `customer_*`; CHECK consistency; `merchants.timezone` DEFAULT **`America/Caracas`**, `merchants.kitchen_priority_horizon_minutes`; index on scheduled active orders; extend `create_order_with_items` RPC. (`manual`)
- [ ] **T49** — Regenerate Supabase types; update `docs/database-schema.md`. (`manual`)
- [ ] **T50** — Domain: extend `Order`, `Cart`; `getKitchenPriorityTier`, **`sortKitchenQueueOrders`** in `domain/order-status.ts` (or `kitchen-queue-sort.ts`); fulfillment + customer validation in `validations.ts` (min lead 5 min, max 7 days — OQ-18). (`vitest`)
- [ ] **T51** — **`domain/kitchen-queue-sort.test.ts`**: immediate always urgent; scheduled > N deferred below; scheduled ≤ N mixed FIFO with immediate by `sentToKitchenAt`; deferred sorted by `readyByAt`; boundary at exactly N. (`vitest`)
- [ ] **T52** — Application: `submitOrder` persists new columns; `listActiveOrders` loads merchant horizon + applies `sortKitchenQueueOrders`. (`vitest`)
- [ ] **T53** — Infrastructure: map columns in `supabase-order-repo.ts`; merchant horizon/timezone read (extend existing merchant/session load or small port). (`manual`)
- [ ] **T54** — **`FulfillmentTimingSelector.tsx`** + **`CustomerContactFields.tsx`**; wire `OrderRegistryView` cart state (immutable `setFulfillmentTiming`). (`manual` L2)
- [ ] **T55** — **`KitchenOrderCard`**: Inmediato / Para las HH:mm badge; customer line; deferred tickets visually de-emphasized optional (muted border — DESIGN.md). (`manual` L2)
- [ ] **T56** — RTL: extend `order-kitchen-flow.integration.test.tsx` — **(D)** deferred scheduled below immediate; **(E)** within-horizon FIFO; **(F)** customer optional + payload; update fake repos. (`rtl`)
- [ ] **T57** — Manual: Realtime insert for deferred scheduled ticket (AC-28); change `kitchen_priority_horizon_minutes` in DB and confirm sort changes after refetch. (`manual` L2)
- [ ] **T58** — Append Phase 7 verification to `progress/order-kitchen-queue.md` (leader/implementer). (`manual`)

---

## Notes for implementer

- Do not edit spec files during implementation; escalate spec gaps to leader/spec_author.
- If Realtime publication fails locally, enable in `config.toml` / dashboard and record in progress journal.
- Preserve hexagonal boundary: Supabase client only in `infrastructure/`.
- Cart state stays client-local until `submitOrder` succeeds — no draft orders table for MVP.
- **Do not** build zones pricing CRUD or auto-calculate delivery fee — waiter enters fee manually.
- **Do not** expose dine-in in MVP waiter UI even though DB enum includes it.
- RTL integration tests are **required** (Phase 5.5). Use fake repos, not live Supabase. Real Realtime remains manual (T41).
- Leader: sync `feature_list.json` `notes` to mention Vitest + RTL + manual Realtime/RLS.
