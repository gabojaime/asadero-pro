# Tasks — Waste Cost Calculator (Merma & Costing)

Ordered vertical slices. Each task fits one implementer session unless noted.

**Gate:** Human approved **OQ-1–OQ-14** on **2026-09-12** (see [requirements.md](./requirements.md#approved-decisions-2026-09-12)). Leader sets `feature_list.json` → `in_progress` and creates `progress/waste-cost-calculator.md`.

Tag: `vitest` | `manual` | `both`

---

## Phase 0 — Approval gate

- [x] **T0** — Human approved OQ-1–OQ-14 (2026-09-12). OQ-8 override includes §5.2 deduction on `completed`; OQ-2 merma % costing-only. Leader updates `feature_list.json` and creates progress journal. (`manual`)

---

## Phase 1 — Schema & domain (TDD first)

- [ ] **T1** — Migration `waste_cost_calculator`: `merchants.target_food_cost_pct`; create `menu_item_costing` + triggers; admin-only RLS; tighten `recipe_ingredients` to admin-only writes (document SELECT choice). (`manual`)
- [ ] **T2** — Regenerate Supabase types → `src/shared/infrastructure/database/supabase.types.ts` (`manual`)
- [ ] **T3** — Domain entities: `MeatPlateCostingRow`, `CostingConfigurationStatus`, errors in `src/domains/waste/domain/entities.ts`, `errors.ts` (`vitest` prep)
- [ ] **T4** — Implement `parseWeightLabelToKg` in `domain/weight-label.ts` (`vitest`)
- [ ] **T5** — Write `domain/weight-label.test.ts`: `1kg`, `500g`, `250g`, null, unknown (`vitest`)
- [ ] **T6** — Implement cost formulas in `domain/cost-formulas.ts` (`vitest`)
- [ ] **T7** — Write `domain/cost-formulas.test.ts` first (AAA): 30% merma + $10 WAC → ~$14.29/kg; 0% merma; plate 0.5kg; optimal @ 0.33; reject edge cases (`vitest`)
- [ ] **T8** — Zod schemas in `domain/validations.ts` (`vitest`)
- [ ] **T9** — Write `domain/validations.test.ts`: reject 100, >100, negative, zero target (`vitest`)
- [ ] **T10** — Repository port `CostingRepository` in `domain/repository.ts` (`vitest` prep)

---

## Phase 2 — Application & infrastructure (costing)

- [ ] **T11** — Pure helper `buildMeatPlateCostingRow` in application layer (`vitest`)
- [ ] **T12** — Use cases: `listMeatPlateCosting`, `updateWastePct`, `updateTargetFoodCostPct` with **admin actor guard** (`vitest`)
- [ ] **T13** — Write `application/use-cases.test.ts` with in-memory fake repo: rejects non-admin; snapshot math; upsert waste (`vitest`)
- [ ] **T14** — `infrastructure/supabase-costing-repo.ts` — JOIN list + upsert + merchant settings (`manual` integration)
- [ ] **T15** — Server actions: `updateWastePctAction`, `updateTargetFoodCostPctAction` (`manual`)
- [ ] **T16** — Query adapters: `useMeatPlateCostingRows`, mutations; keys `['meat-plate-costing', merchantId]` (`manual`)

---

## Phase 3 — RBAC narrowing (admin-only /waste)

- [ ] **T17** — Update `src/domains/auth/domain/rbac.ts`: `/waste` false for `grill_master` (`vitest`)
- [ ] **T18** — Update `src/domains/auth/domain/rbac.test.ts` (`vitest`)
- [ ] **T19** — Change `src/app/(app)/waste/layout.tsx` to `allowedRoles={['admin']}` (`manual`)
- [ ] **T20** — Update `app-sidebar.tsx`: remove `/waste` from grillmaster nav; rename admin label to **“Merma y costos”** (`manual` L2)

---

## Phase 4 — Presentation & UI (costing)

- [ ] **T21** — `WasteCostingView.tsx` — header with global target food cost % + main table (`manual` L2)
- [ ] **T22** — `MeatPlateCostingTable.tsx` — columns, inline merma editor, configuration badges, es-ES USD (`manual` L2)
- [ ] **T23** — Wire `src/app/(app)/waste/page.tsx` as thin container (`manual` L2)
- [ ] **T24** — Loading, error, empty states; mutation toasts; query invalidation (`manual` L2)
- [ ] **T25** — Verify orders menu catalog repo uses explicit columns — no `waste_pct` leak (`vitest` grep / review)

---

## Phase 5 — Inventory deduction vertical slice (§5.2, OQ-8)

- [ ] **T33** — Migration extension: `orders.inventory_deducted_at`; extend `inventory_movements` (`order_id`, `metadata`, `movement_type` includes `order_deduction`); unique index on `(order_id, raw_material_id)` for deductions; implement `complete_order_and_deduct_inventory` SECURITY DEFINER RPC with clamp-to-zero + partial metadata. (`manual`)
- [ ] **T34** — Regenerate Supabase types after T33 (`manual`)
- [ ] **T35** — Domain `aggregateRecipeDeductions` in `waste/domain/recipe-deduction.ts` — **no merma % parameter** (`vitest`)
- [ ] **T36** — Write `recipe-deduction.test.ts`: multi-line aggregation; unlinked items skipped; AC-17 fixture (`vitest`)
- [ ] **T37** — Orders domain `completeOrder` in `orders/domain/order-completion.ts` + tests (`served` → `completed` only) (`vitest`)
- [ ] **T38** — Port `InventoryDeductionRepository` + `supabase-inventory-deduction-repo.ts` wrapping RPC (`vitest` prep + manual)
- [ ] **T39** — Application `completeOrder` use case: waiter/admin guard; calls deduction repo; idempotent second call test with fake repos (`vitest`)
- [ ] **T40** — Orders infra: `completeOrderAction`, `useCompleteOrder` mutation; invalidate served-orders + raw-materials queries (`manual`)
- [ ] **T41** — Minimal `/orders` UI: list `served` orders + **Completar pedido** button (waiter/admin); no costing fields (`manual` L2)
- [ ] **T42** — Manual L3: complete order → `quantity_on_hand` decreases by recipe × qty (not merma-adjusted); grillmaster mark ready does not deduct (AC-15, AC-19) (`manual` L3)
- [ ] **T43** — Manual L3: insufficient stock → order completes, stock clamps to 0, movement metadata partial (AC-18) (`manual` L3)
- [ ] **T44** — Manual L4: idempotent double-complete; cross-tenant RPC deny; grillmaster forbidden (AC-16, AC-20, AC-21) (`manual` L4)

---

## Phase 6 — Seed, verification & docs

- [ ] **T26** — `supabase/seeds/waste_cost_calculator.sql`: default `waste_pct` + `recipe_ingredients` for 9 meat plates; wire in `supabase/seed.sql` (`manual`)
- [ ] **T27** — Manual L3: after `db reset`, admin sees costing rows with recipe links and default merma (`manual` L3)
- [ ] **T28** — Manual L4: grillmaster/waiter RLS + route denial on `/waste` and `menu_item_costing` mutations (`manual` L4)
- [ ] **T29** — Manual L4: cross-tenant isolation on costing table (`manual` L4)
- [ ] **T30** — Walk acceptance criteria AC-1–AC-21; record in `progress/waste-cost-calculator.md` (`manual`)
- [ ] **T31** — Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (`vitest` + CLI)
- [ ] **T32** — Update `docs/database-schema.md` with costing + deduction schema (`manual` review)

---

## Checkpoint — After Phase 1 (T1–T10)

- [ ] Migration applied locally (costing tables; deduction columns may land in T33)
- [ ] Domain Vitest green for formulas + validations + weight parser
- [ ] Formula semantics match OQ-3; deduction domain stub ready for T35

## Checkpoint — After Phase 3 (T17–T20)

- [ ] `grill_master` cannot reach `/waste` (route + nav)
- [ ] `rbac.test.ts` passes

## Checkpoint — After Phase 5 (T33–T44)

- [ ] Waiter/admin can complete `served` → `completed`
- [ ] Stock deducts by recipe `quantity_kg × line qty` only (merma % not in formula)
- [ ] Idempotent completion; partial stock clamp documented in movements
- [ ] Grillmaster `served` transition does not deduct

## Checkpoint — Complete (T31–T32)

- [ ] Admin can configure merma % and see recommended prices
- [ ] Checkout deducts inventory on `completed`; **`waste_logs` still out of scope**
- [ ] Ready for reviewer

---

## Dependency graph (summary)

```
T0 approved
  → T1 migration (costing)
  → T2 types
  → T3–T10 domain (parallel TDD)
  → T11–T16 costing application/infra
  → T17–T20 RBAC
  → T21–T25 costing UI
  → T33–T44 deduction slice (depends on T1 recipe_ingredients seed path; T26 seed can parallel)
  → T26 seed
  → T27–T32 verification & docs
```

## Risks

| Risk | Mitigation |
|------|------------|
| OQ-2 vs OQ-8 confusion | Spec normative reconciliation; T35–T36 assert no merma in aggregation |
| `completed` not reachable today | T37 + T41 minimal waiter completion path |
| Waiter cannot UPDATE inventory RLS | T33 SECURITY DEFINER RPC |
| Double deduction | T33 `inventory_deducted_at` + unique movement index; T39/T44 tests |
| Insufficient stock blocks checkout | T33 clamp + metadata; T43 manual |
| Multiple `recipe_ingredients` rows | Seed one row; repo/RPC picks deterministic single row |
| RBAC conflict with multi-tenant-auth docs | Spec supersedes; progress notes |
