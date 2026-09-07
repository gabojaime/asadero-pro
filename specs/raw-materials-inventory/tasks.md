# Tasks — Raw Materials Inventory Management

Ordered vertical slices. Each task is one implementer session or less. Tag: `vitest` | `manual` | `both`.

OQs are **locked** (see requirements.md). Do not re-open product questions.

---

## Phase 1 — Schema & domain (TDD first)

- [x] **T1** — Create migration `raw_materials_dual_uom`: enum `unit_of_measure`, rename `stock_kg` → `quantity_on_hand`, add `is_active`, create `inventory_movements`, `get_user_role()`, replace RLS with admin-only writes, partial unique index on active name per merchant. **No integer CHECK on `unit`.** (`manual` — apply via `pnpm dlx supabase db reset`)
- [x] **T2** — Regenerate Supabase types: `pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts` (`manual`) — **blocked:** Docker not running; types hand-synced from migration SQL
- [x] **T3** — Domain entities: `RawMaterial`, `InventoryMovement`, `UnitOfMeasure`, `ReceiveStockInput` in `src/domains/raw-materials/domain/entities.ts` (`vitest` prep)
- [x] **T4** — Implement `roundMoney`, `roundQuantityForUom` (3 dp for **both** UoM), `updateWeightedAverageCost` in `domain/weighted-average-cost.ts` (`vitest`)
- [x] **T5** — Write `domain/weighted-average-cost.test.ts` first (AAA): first receipt, existing stock blend, zero incoming cost with stock, zero-cost first receipt, reject negative/zero incoming qty, money rounding (`vitest`)
- [x] **T6** — Zod schemas + `validateQuantityForUom` in `domain/validations.ts` — **do not reject fractions for `unit`** (`vitest`)
- [x] **T7** — Write `domain/validations.test.ts`: kg allows 3 decimals; **unit allows fractions** (e.g. 0.5); reject > 3 fractional digits; name/sku trim; receive input bounds (`vitest`)
- [x] **T8** — Domain errors (`RawMaterialError`) and repository port in `domain/repository.ts` (`vitest` prep)

---

## Phase 2 — Application & infrastructure

- [x] **T9** — Use cases: `createRawMaterial`, `updateRawMaterial`, `deactivateRawMaterial`, `listRawMaterials`, `receiveStock` with admin actor guard in `application/use-cases.ts` (`vitest`)
- [x] **T10** — Write `application/use-cases.test.ts` with in-memory fake repo: receiveStock calls WAC and persists via port; rejects non-admin; fractional unit receipt (`vitest`)
- [x] **T11** — Supabase repository `infrastructure/supabase-repo.ts`: CRUD + `applyReceipt` (UPDATE + INSERT movement; prefer transaction/RPC if needed) (`manual` — integration)
- [x] **T12** — Server actions: `createRawMaterialAction`, `updateRawMaterialAction`, `deactivateRawMaterialAction`, `receiveStockAction` following auth `staff-user-action.ts` pattern (`manual`)
- [x] **T13** — Query adapters: `useRawMaterials`, mutations, movement query; keys `['raw-materials', merchantId, filters]` (`manual`)

---

## Phase 3 — RBAC & route gate

- [x] **T14** — Update `src/domains/auth/domain/rbac.ts`: `/inventory` admin-only; remove from grill_master nav access (`vitest`)
- [x] **T15** — Update `rbac.test.ts` for new matrix (AC-10, AC-18) (`vitest`)
- [x] **T16** — Change `src/app/(app)/inventory/layout.tsx` to `allowedRoles={['admin']}` (`manual`)
- [ ] **T17** — Verify sidebar: grill_master no longer sees Inventario via `getNavRoutesForRole` (`manual` L2)

---

## Phase 4 — Presentation & UI

- [x] **T18** — Install shadcn primitives if missing (`table`, `dialog`, `form`, `select`) into `src/shared/presentation/ui/` (`manual`)
- [x] **T19** — `QuantityDisplay`, `UnitOfMeasureSelect` helpers with Spanish labels and unit suffixes; fractional display for `unit` (`manual`)
- [x] **T20** — `RawMaterialTable` — list with columns per design.md; flat DESIGN.md styling (`manual` L1)
- [x] **T21** — `RawMaterialFormDialog` — create + edit (name, sku, uom on create only); deactivate action on edit (`manual` L2)
- [x] **T22** — `ReceiveStockDialog` — receipt form `step={0.001}` for **both** UoM + optional recent movements list (`manual` L2)
- [x] **T23** — `InventoryView` + wire `src/app/(app)/inventory/page.tsx` as thin container (`manual` L2)
- [x] **T24** — Loading, error, empty states; mutation toasts; invalidate queries on success (`manual` L2)

---

## Phase 5 — Seed, verification & docs

- [ ] **T25** — Manual L4: admin-only INSERT/UPDATE via Supabase client as grill_master fails RLS (`manual` L4`)
- [ ] **T26** — Manual L4: merchant A cannot SELECT merchant B inventory (`manual` L4`)
- [ ] **T27** — Walk acceptance criteria AC-1–AC-19 in `requirements.md`; record in `progress/raw-materials-inventory.md` (`manual` L2`)
- [x] **T28** — Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (`vitest` + CLI)
- [x] **T29** — Update `docs/database-schema.md`: new enum, columns, `inventory_movements`, RLS policies, unique index, remove `stock_kg` reference (`manual` review)
- [x] **T30** — **Required:** add `supabase/seeds/dev_raw_materials.sql` with 18 floor items + suggested UoM; wire `[db.seed]` / `supabase/seed.sql`; idempotent attach to `merchants.id`. **Do not** insert catalog in production migrations or onboarding RPC (`manual`)
- [x] **T31** — Document local seed workflow in `docs/supabase.md` (onboard then re-seed; local/dev only; not production onboarding) (`manual`)

---

## Dependency graph (summary)

```
T1 → T2 → T11
T3 → T4 → T5 → T9 → T10 → T11 → T12 → T13 → T20–T24
T6 → T7 → T9
T14 → T15 → T16 → T17
T30 → T31 (can run after T1)
T25–T29 after UI complete
```

## Locked decisions (do not re-open)

| OQ | Decision |
|----|----------|
| OQ-1 | Fractional `unit` allowed; `DECIMAL(10,3)` for both UoM |
| OQ-2 | UoM immutable after create |
| OQ-3 | Grill master full block on `/inventory` |
| OQ-4 | SKU optional, no uniqueness |
| OQ-5 | UNIQUE name per merchant (active items) |
| OQ-6 | Soft deactivate `is_active`; no hard delete UI |
| OQ-7 | Required local/dev seed of 18 items; not production onboarding |
| OQ-8 | Cubito = `unit` (bag); fractions allowed |
| OQ-9 | Condiments default `kilogram` in seed |
| OQ-10 | Papel aluminio default `unit` |
| OQ-11 | `inventory_movements` in scope for receipts |

## Notes for implementer

- Do **not** import `@supabase/supabase-js` in presentation or `src/app/`.
- WAC math only in `domain/weighted-average-cost.ts`.
- Do **not** git commit unless the user explicitly asks (leader/parent will commit).
- Amendment note for auth spec matrix goes in progress journal (multi-tenant-auth AC-9 superseded for `/inventory` only).
- Skills: `incremental-implementation`, `frontend-ui-engineering` + DESIGN.md, `test-driven-development`, `security-and-hardening`, project `supabase` / `supabase-postgres-best-practices` before SQL.
