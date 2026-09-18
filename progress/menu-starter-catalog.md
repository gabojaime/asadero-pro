# Feature: Opt-in starter menu catalog on empty /menu

| Field | Value |
|-------|-------|
| id | menu-starter-catalog |
| status | done |
| spec | specs/menu-starter-catalog/ |
| verification | automated (hybrid: Vitest seed use case + manual UI/RLS) |
| depends_on | menu-items-crud, raw-materials-inventory |

## 2026-09-18 — leader

**Action:** Evaluation of raw_materials dependency, then backlog entry (`pending`). Spec author kickoff.

### Dependency verdict

**Inserting starter `menu_items` only does NOT require existing `raw_materials_inventory` rows.**

Evidence:

- `docs/database-schema.md`: `menu_items` FKs only `merchants(id)`. Columns used by `supabase/seeds/order_menu_catalog.sql` are `merchant_id`, `name`, `item_kind`, `protein_group`, `weight_label`, `price`, `is_active`. No `raw_material_id`.
- `order_menu_catalog.sql` is a `CROSS JOIN merchants` + `VALUES` insert with `WHERE NOT EXISTS` on `lower(trim(name))` per merchant. No join to inventory.

**A useful starter (plates with merma costing + checkout deduction) DOES require protein raw materials**, then `recipe_ingredients` + `menu_item_costing`.

Evidence:

- `recipe_ingredients.raw_material_id` → `raw_materials_inventory(id) ON DELETE CASCADE`.
- `supabase/seeds/waste_cost_calculator.sql` `INNER JOIN`s meat plates to inventory by **normalized name** (not id, not SKU):
  - `protein_group = beef` → `Carne`
  - `protein_group = pork` → `Cochino`
  - `protein_group = chicken` → `Pollo`
- `quantity_kg` from `weight_label` (`1kg` 1.000, `500g` 0.500, `250g` 0.250).
- `menu_item_costing.waste_pct` defaults: beef 30, pork 25, chicken 20. That table FKs `menu_items` only (no inventory FK).
- Drinks/sides in the menu seed are never recipe-linked (expected; waste spec FR-7).
- Local seed order in `supabase/config.toml`: `dev_raw_materials.sql` → `order_menu_catalog.sql` → `waste_cost_calculator.sql`.

**Linking:** seed menu rows and seed materials are **not** linked by shared UUID. They share a **tenant** (`merchant_id`) and later a **name match** in the waste seed. Inventory seed does not set `sku`.

**Inventory starter already exists:** `/inventory` empty catalog (`count = 0` including inactive) offers admin-only `seedStarterRawMaterials` from `src/domains/raw-materials/domain/starter-catalog.ts` (18 items, keep in sync with `dev_raw_materials.sql`). Protein names match the waste join.

**Current `/menu` empty state:** `MenuCatalogView` shows only “No hay ítems en el menú.” plus “Nuevo ítem”. No starter CTA.

**OQ-11 revisit:** `specs/menu-items-crud` forbade production onboarding auto-insert. This feature is **opt-in empty-state**, not onboarding.

### Recommended UX: **C** (not A, not B)

- **A** (menu-only + optional inventory callout): valid for selling, but `/waste` and order deduction stay incomplete until a later seed or manual recipe work.
- **B** (block until materials exist): unnecessarily blocks waiters/menu CRUD; user asked to *suggest* inventory first, not hard-gate.
- **C** (default): always allow loading **menu_items** (no FK). If Carne/Pollo/Cochino exist (active, name match, kilogram), also insert **recipe_ingredients + menu_item_costing** using the same rules as `waste_cost_calculator.sql`. If proteins missing, load menu-only and warn with link to `/inventory` (starter catalog or manual create). Do **not** auto-insert on merchant onboarding.

**Notes:** Do not invoke notion-task-manager. Leader does not edit `src/`.

**Verification:** Recorded `automated` for domain/application seed logic (mirror inventory starter). UI/RLS remain manual. Human may change preference.

**Next:** spec_author writes `specs/menu-starter-catalog/` then leader sets `spec_ready` and waits for human approval.

## 2026-09-18 — leader

**Action:** spec_author completed. Status `spec_ready`. Waiting for explicit human approval before `in_progress` / implementer.

**Changes:**
- `specs/menu-starter-catalog/{README,requirements,design,tasks}.md`
- `feature_list.json` status → `spec_ready`

**Notes:** Do not implement until human approves OQ-1–OQ-6 (OQ-7 minor). No Notion sync.

## 2026-09-18 — leader

**Action:** Human approved spec with ALL recommended OQ defaults. Status `in_progress`. Launching implementer. No Notion / notion-task-manager.

**OQs locked:**

| OQ | Decision |
|----|----------|
| OQ-1 | UX C — always load the 14 menu items. If Carne/Cochino/Pollo exist (active, kilogram, name match), attach recipes + costing (same rules as `waste_cost_calculator.sql`). If missing, menu + warning + link to `/inventory`. Do **not** seed inventory from `/menu`. |
| OQ-2 | Recipes + costing ARE in this feature, **only for the starter path** (exception). Manual create item does not auto-attach recipes. |
| OQ-3 | Link to `/inventory` only; do not invoke `seedStarterRawMaterials` from `/menu`. |
| OQ-4 | Empty = 0 rows including inactive (mirror inventory). |
| OQ-5 | Partial attach + warning if only some proteins exist. |
| OQ-6 | Hybrid verification (Vitest use case + manual UI/RLS). |
| OQ-7 | Button label Spanish «Cargar menú inicial». |

**Out of scope reaffirmed:** no auto-run on merchant onboarding (menu-items-crud OQ-11).

**Next:** implementer executes `specs/menu-starter-catalog/tasks.md` fully. Leader will set `review_pending` (not `done`) when implementation lands.

## 2026-09-18 17:30 — implementer

**Task:** Start — tasks.md §1–§8

**Changes:** (in progress)

**Verification:** pending

**Notes:** OQs locked per leader entry. No Notion sync.

## 2026-09-18 17:36 — implementer

**Task:** tasks.md §1–§8 — full implementation

**Changes:**
- `src/domains/menu/domain/starter-catalog.ts` — `STARTER_MENU_ITEMS` (14), `normalizeMenuItemName`, `defaultWastePctForProteinGroup`, SQL parity list
- `src/domains/menu/domain/starter-catalog.test.ts` — length, uniqueness, name parity
- `src/domains/menu/domain/repository.ts` + `supabase-menu-repo.ts` — `createMany` batch insert
- `src/domains/waste/domain/repository.ts` — `ensureDefaultWastePctIfMissing`; `ensureInferredRecipeIngredient` returns `boolean`
- `src/domains/waste/infrastructure/supabase-costing-repo.ts` — kg-only protein fetch, idempotent costing insert, recipe insert boolean
- `src/domains/waste/domain/protein-inventory-link.ts` — `buildProteinInsumoAvailability`
- `src/domains/menu/application/use-cases.ts` — `seedStarterMenuCatalog` + structured result
- `src/domains/menu/application/use-cases.test.ts` — seed matrix (8 cases)
- `src/domains/menu/infrastructure/menu-item-actions.ts` — `seedStarterMenuCatalogAction`, `listProteinInsumoAvailabilityAction`
- `src/domains/menu/infrastructure/query-adapters.ts` — `useSeedStarterMenuCatalog`, `useProteinInsumoAvailability`, invalidates menu + orders + waste keys
- `src/domains/menu/presentation/MenuCatalogView.tsx` — dashed empty card, «Cargar menú inicial», protein callout + post-seed warning with `/inventory` and `/waste` links

**Verification:**
- `pnpm test` — 221/221 pass
- `pnpm exec tsc --noEmit` — pass
- `pnpm exec eslint` on touched paths — pass
- `pnpm lint` (repo root) — fails on generated `.next` artifacts (pre-existing; not introduced by this feature)
- Manual L2 smoke (localhost:3000, admin `asadero2`): empty `/menu` shows starter card; seed → status «Se cargaron 14 ítems…» and 14 table rows (proteins present from prior inventory seed → recipes expected)

**Tasks checklist (tasks.md):**
- [x] §1 Domain starter constant
- [x] §2 Menu repository batch create
- [x] §3 Waste costing port extension
- [x] §4 Application use case + tests
- [x] §5 Server action and query adapter
- [x] §6 Presentation empty state
- [x] §7 Documentation sync (progress only — cross-context note below)
- [x] §8 CLI verification; partial manual (L2 smoke only)

**Notes / deviations:**
- `ensureInferredRecipeIngredient` port now returns `boolean` (inserted vs skipped) for accurate `recipesAttachedCount`.
- `defaultWastePctForProteinGroup` lives in `menu/domain/starter-catalog.ts` per spec; `waste/infrastructure` imports this pure helper (acceptable cross-domain constant).
- Empty-state detection uses `catalogQuery.isSuccess && data.length === 0` to avoid SSR/client flash before fetch (hydration-safe for menu body; unrelated `AsaderoLogo` hydration warning still visible in dev overlay).
- **Remaining manual (human):** L3 `/orders` catalog + `/waste` rows after seed; L4 non-admin / cross-tenant RLS; menu-only path (merchant without protein kg insumos); re-run seed idempotency with partial pre-existing names.
- Feature **not** marked done — ready for `reviewer` / leader → `review_pending`.

## 2026-09-18 — leader

**Action:** Implementer finished tasks.md §1–§8. Status `review_pending` (not `done`). Launching reviewer. No Notion / notion-task-manager.

**Summary:** Opt-in starter on empty `/menu` (14 items, UX C). Recipes/costing only on starter path. Vitest 221/221, tsc pass. L2 smoke: seed 14 rows. Remaining human: L3 `/orders`+`/waste`, L4 RBAC/RLS, menu-only proteins missing, re-seed idempotency.

**Deviations (for reviewer):** `ensureInferredRecipeIngredient` → `boolean`; empty via `isSuccess`; waste_pct helper in menu domain imported by waste infra.

## 2026-09-18 17:38 — reviewer

**Verdict:** pass_with_notes

**Findings:**

- [note] Spec compliance (OQ-1–OQ-7 locked): UX C implemented — always inserts 14 `STARTER_MENU_ITEMS`; recipes/costing only in `seedStarterMenuCatalog` for newly inserted meat plates; no inventory seed from `/menu`; empty = `activeOnly: false` length 0; partial attach + `missingProteinGroups`; CTA «Cargar menú inicial»; no onboarding auto-seed (auth paths untouched). Manual create remains recipe-free.
- [note] Hexagonal / FR-6: domain constant pure; application orchestrates `MenuItemRepository` + `CostingRepository` port; presentation uses query adapters only (no `@supabase/supabase-js`). Accepted deviations: `ensureInferredRecipeIngredient` → `boolean`; empty via `catalogQuery.isSuccess`; `defaultWastePctForProteinGroup` in menu domain imported by waste infra.
- [note] FR-9 invalidation: `useSeedStarterMenuCatalog` calls `invalidateMenuConsumers` (`menu-catalog`, `menu-items`, `meat-plate-costing`) plus protein-availability key.
- [note] Security: use-case `assertAdmin` + session `merchantId`; protein availability action admin-gated; kg filter on protein fetch; generic Spanish action errors; no service-role client. L4 RLS still human.
- [note] DESIGN.md empty card: dashed border, outline starter, primary Nuevo ítem, links to `/inventory` / `/waste`, no `shadow-lg` / weight 500 observed.
- [note] `starter-catalog.test.ts` SQL parity uses co-located `STARTER_MENU_ITEM_NAMES_FROM_SQL`, not a parse of `order_menu_catalog.sql` — weak AC-10 guard (optional harden later).
- [note] `seedStarterMenuCatalog` treats `ensureInferredRecipeIngredient === false` as skip/missing; boolean conflates “already exists” vs “unavailable”. Safe for newly inserted starter rows; if reused elsewhere, prefer ternary result before skipping costing.
- [note] Empty detection uses a single always-`activeOnly: false` list (simpler than InventoryView dual-query). FR-2 semantics correct: any inactive ghost hides starter CTA.
- [note] Reviewer re-ran Vitest on menu starter + menu/waste use-case suites: 26/26 pass.

**Blocking:** none

**Manual verification status:** partial

| Slice | Status |
|-------|--------|
| Vitest constant + seed matrix (AC-3,4,5,6,7,8,10) | confirmed (implementer 221/221; reviewer spot-check 26/26) |
| L2 empty CTA + seed 14 rows (AC-1, AC-3) | confirmed (implementer smoke) |
| AC-2 (≥1 row incl. inactive hides starter) | not_run |
| AC-4 menu-only UI warning (no proteins) | not_run (covered by Vitest; UI path remaining) |
| L3 `/orders` + `/waste` after full seed (AC-5, AC-9) | not_run |
| L4 non-admin / cross-tenant (AC-11) | not_run |
| Re-seed idempotency / partial pre-existing names | not_run |

**CHECKPOINTS:** Spec/process, hexagonal, conventions, presentation tokens, automated domain tests OK. Manual L3/L4 and AC-2 still open — do **not** mark `done` until human completes remaining QA (or explicitly accepts residual risk).

**Recommendation to leader:** Keep `review_pending` (or move to a human-QA hold). After L3/L4 + AC-2/menu-only UI pass, promote to `done`.

## 2026-09-18 — leader

**Action:** Reviewer `pass_with_notes`. Status remains `review_pending` (not `done`). No Notion.

**Next:** Human manual QA (AC-2, menu-only UI, L3, L4, re-seed). Then leader can set `done`.

## 2026-09-18 — leader

**Action:** Human smoke passed; everything looks correct. Status `done`. Closing spec. No Notion / notion-task-manager.

**Verification:** Human accepted residual L3/L4, AC-2, menu-only UI, and re-seed after starter empty-state smoke.

**Notes:** `menu-items-crud` stays `review_pending` (this batch is starter catalog only). Semantic Conventional Commits for this feature follow.
