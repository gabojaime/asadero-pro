# Tasks — Menu Items CRUD

Ordered vertical slices. Each task is one implementer session or less. Tag: `vitest` | `manual` | `both`.

Resolve open questions in [requirements.md](./requirements.md) at human approval before implementation. Recommended defaults are documented there.

---

## Phase 1 — Schema & domain (TDD first)

- [ ] **T1** — Migration `menu_items_admin_rls`: admin INSERT/UPDATE RLS policies; `CHECK (price >= 0)`; partial unique index `(merchant_id, lower(trim(name))) WHERE is_active = true`. **No DELETE policy.** (`manual` — `pnpm dlx supabase db reset`)
- [ ] **T2** — Regenerate Supabase types to `src/shared/infrastructure/database/supabase.types.ts` (`manual`)
- [ ] **T3** — Scaffold `src/domains/menu/domain/entities.ts`: `MenuItem`, `MenuItemKind`, `ProteinGroup` (`vitest` prep)
- [ ] **T4** — Zod schemas + `assertKindFieldRules` in `domain/validations.ts` (FR-2, price ≥ 0, name trim/max) (`vitest`)
- [ ] **T5** — Write `domain/validations.test.ts` first (AAA): meat plate required fields; drink/side null protein/weight; negative price rejected (`vitest`)
- [ ] **T6** — Domain errors + `MenuItemRepository` port in `domain/repository.ts` (`vitest` prep)

---

## Phase 2 — Application & infrastructure

- [ ] **T7** — Use cases: `listMenuItems`, `createMenuItem`, `updateMenuItem`, `deactivateMenuItem`, `reactivateMenuItem` with admin actor guard in `application/use-cases.ts` (`vitest`)
- [ ] **T8** — Write `application/use-cases.test.ts` with in-memory fake repo: rejects non-admin; reactivate sets active; kind not changed on update (`vitest`)
- [ ] **T9** — `infrastructure/supabase-menu-repo.ts`: list (optional active filter), getById, create, update, setActive (`manual` — integration)
- [ ] **T10** — Server actions in `infrastructure/menu-item-actions.ts` following auth/raw-materials pattern; Spanish error mapping including duplicate name (`manual`)
- [ ] **T11** — Query adapters: `menuCatalogQueryKey`, hooks, mutations; central `invalidateMenuConsumers` for `menu-catalog`, `menu-items`, `meat-plate-costing` keys (`manual`)

---

## Phase 3 — RBAC, route, sidebar

- [ ] **T12** — Update `src/domains/auth/domain/rbac.ts`: add `"/menu"` to `AppRoute`, `APP_NAV_ROUTES`, `PROTECTED_APP_ROUTES`, `ROLE_ROUTE_ACCESS` (admin only) (`vitest`)
- [ ] **T13** — Update `rbac.test.ts` for `/menu` matrix (AC-17) (`vitest`)
- [ ] **T14** — Add `src/app/(app)/menu/layout.tsx` with `RoleRouteGate route="/menu" allowedRoles={["admin"]}` (`manual`)
- [ ] **T15** — Update `app-sidebar.tsx`: `ROUTE_META` label **Menú**, `UtensilsCrossed` icon, `ADMIN_NAV_ORDER` insert `"/menu"` after `"/inventory"` (`manual` L2)

---

## Phase 4 — Presentation & UI

- [ ] **T16** — `MenuPriceDisplay` + kind/protein Spanish label helpers (`manual`)
- [ ] **T17** — `MenuItemTable` with kind badge, status badge, price column, actions (`manual` L1)
- [ ] **T18** — `MenuItemFormDialog` — create/edit; conditional meat fields; read-only kind on edit; waste hint alert with link to `/waste`; deactivate confirm (`manual` L2)
- [ ] **T19** — `MenuCatalogView` — filter **Mostrar inactivos**, reactivate action, **Nuevo ítem** button (`manual` L2)
- [ ] **T20** — Wire `src/app/(app)/menu/page.tsx` as thin container; loading/error/empty states per DESIGN.md (`manual` L2)

---

## Phase 5 — Orders adapter & regression

- [ ] **T21** — Keep `orders/infrastructure/supabase-menu-catalog-repo.ts` read-only; optional shared row mapper with menu infra (`manual`)
- [ ] **T22** — Manual L3: admin price/name change + deactivate → waiter `/orders` catalog reflects after invalidation (`manual` L3)
- [ ] **T23** — Manual L3: waste `/waste` costing table refreshes after menu mutation (name/price/active) (`manual` L3)

---

## Phase 6 — Verification & docs

- [ ] **T24** — Manual L4: grill_master/waiter Supabase INSERT/UPDATE on `menu_items` fails RLS (`manual` L4)
- [ ] **T25** — Manual L4: merchant A cannot read/write merchant B menu items (`manual` L4)
- [ ] **T26** — Walk acceptance criteria AC-1–AC-19 in `requirements.md`; record in `progress/menu-items-crud.md` (`manual` L2)
- [ ] **T27** — Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (`vitest` + CLI)
- [ ] **T28** — Update `docs/database-schema.md`: menu_items RLS INSERT/UPDATE, CHECK, unique index (`manual` review)
- [ ] **T29** — Update `docs/architecture.md`: `/menu` route, `src/domains/menu/` bounded context (`manual` review)
- [ ] **T30** — Append RBAC amendment note to `progress/menu-items-crud.md` (`/menu` admin-only) (`manual`)

---

## Dependency graph (summary)

```
T1 → T2 → T9
T3 → T4 → T5 → T7 → T8 → T9 → T10 → T11 → T17–T20
T12 → T13 → T14 → T15
T21 → T22 → T23
T24–T30 after UI complete
```

## Recommended decisions (pending human lock)

| OQ | Recommendation |
|----|----------------|
| OQ-1 | `/menu` admin-only |
| OQ-2 | Soft delete + reactivate; no hard DELETE |
| OQ-3 | Partial unique active name per merchant |
| OQ-4 | `item_kind` immutable after create |
| OQ-5 | Table with kind badge; optional section headers |
| OQ-6 | `price >= 0` CHECK |
| OQ-7 | Route `/menu`, nav **Menú** |
| OQ-8 | No order_items name denormalization |
| OQ-9 | New `src/domains/menu/` context |
| OQ-10 | Sidebar label **Menú** |
| OQ-11 | No production menu seed change |

## Notes for implementer

- Do **not** import `@supabase/supabase-js` in presentation or `src/app/`.
- Do **not** auto-insert `recipe_ingredients` / `menu_item_costing` on create.
- Skills: `incremental-implementation`, `frontend-ui-engineering` + DESIGN.md, `test-driven-development`, `security-and-hardening`, project `supabase` / `supabase-postgres-best-practices` before SQL.
- Do **not** git commit unless the user explicitly asks.
- Query key for orders catalog remains `['menu-items', merchantId]` — import `menuItemsQueryKey` from orders query adapters when invalidating.
