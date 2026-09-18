# Tasks — Menu Starter Catalog

Implement in order. Check off each item in `progress/menu-starter-catalog.md` as completed.

---

## 1. Domain starter constant

- [ ] Add `src/domains/menu/domain/starter-catalog.ts` with `STARTER_MENU_ITEMS` (14 rows), `normalizeMenuItemName`, comment linking `supabase/seeds/order_menu_catalog.sql`
- [ ] Add optional `defaultWastePctForProteinGroup` pure helper (beef 30, pork 25, chicken 20) — menu or waste domain per implementer choice; document in progress if placed in waste
- [ ] Add `src/domains/menu/domain/starter-catalog.test.ts` — length 14, unique names, name list parity with SQL seed

**Verification:** `vitest`

---

## 2. Menu repository batch create

- [ ] Extend `MenuItemRepository` with `createMany(inputs: CreateMenuItemPayload[]): Promise<MenuItem[]>`
- [ ] Implement in `supabase-menu-repo.ts` (batch insert + select + row mapper)
- [ ] Map Postgres `23505` to `MenuItemError` duplicate_name where applicable

**Verification:** `vitest` (optional repo integration) or covered by use-case tests with mock

---

## 3. Waste costing port extension

- [ ] Add `ensureDefaultWastePctIfMissing` to `CostingRepository` in `waste/domain/repository.ts`
- [ ] Implement in `supabase-costing-repo.ts` — insert default `waste_pct` only when no row exists; use `defaultWastePctForProteinGroup`
- [ ] (Recommended) Filter protein material fetch to `unit_of_measure = 'kilogram'` for inference used by starter attach

**Verification:** `vitest` (unit test on helper + optional repo mock)

---

## 4. Application use case

- [ ] Implement `seedStarterMenuCatalog(profile, menuRepo, costingRepo)` in `menu/application/use-cases.ts`
- [ ] Admin guard, idempotent name skip, `createMany`, recipe/costing attach loop for new meat plates only
- [ ] Return structured result (`insertedCount`, `skippedCount`, `recipesAttachedCount`, `costingAttachedCount`, `recipesSkippedCount`, `missingProteinGroups`, `items`)
- [ ] Add tests in `menu/application/use-cases.test.ts`: full insert, all skipped, non-admin forbidden, menu-only (no proteins), partial proteins, drinks/sides without recipe calls

**Verification:** `vitest`

---

## 5. Server action and query adapter

- [ ] Add `seedStarterMenuCatalogAction` in `menu-item-actions.ts` (session profile, repos, map errors to ActionFailure)
- [ ] Add `useSeedStarterMenuCatalog(merchantId)` mutation in `query-adapters.ts`
- [ ] On success call existing `invalidateMenuConsumers`

**Verification:** `manual` (smoke via UI) + `vitest` if action logic is thin

---

## 6. Presentation empty state

- [ ] Update `MenuCatalogView.tsx`: detect `menuCatalogIsEmpty` (mirror inventory dual-query pattern)
- [ ] Dashed empty card, Spanish copy, **Nuevo ítem** + outline *Cargar menú inicial*
- [ ] Protein callout with `Link` to `/inventory` (pre-seed optional availability query or post-seed warning from mutation result)
- [ ] Success / warning status messages; keep header **Nuevo ítem**
- [ ] DESIGN.md compliance (dashed border, no shadow-lg, weights 300/400/600/700)

**Verification:** `manual` L2

---

## 7. Documentation sync (if needed)

- [ ] If port or behavior is non-obvious, add one paragraph to `docs/architecture.md` or `progress/menu-starter-catalog.md` only (no spec edits post-approval without re-approval)

**Verification:** `manual` review

---

## 8. End-to-end verification

- [ ] **Manual L2:** Admin empty `/menu` → seed → table with 14 rows; warning path without inventory
- [ ] **Manual L3:** `/orders` shows items; with proteins, `/waste` shows recipes + default merma
- [ ] **Manual L4:** Non-admin / cross-tenant cannot seed
- [ ] Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`

**Verification:** `manual` + CLI

---

## Dependency notes

- Requires menu-items-crud landed ( `/menu`, RLS INSERT, `invalidateMenuConsumers` )
- Inventory starter optional for full recipe path; menu-only path must work without it
- Do not invoke `seedStarterRawMaterials` from menu action unless OQ-3 re-opened
