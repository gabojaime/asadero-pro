# Feature: Order Registration & Kitchen Queue (Waiter Cart + Comandas)

| Field | Value |
|-------|-------|
| id | order-kitchen-queue |
| status | done |
| spec | specs/order-kitchen-queue/ |
| verification | automated |
| branch | feat/order-kitchen-queue |

## 2026-09-12 15:33 — leader

**Action:** Feature registered in harness backlog. Spec already written and **human-approved 2026-09-12**. Status → `spec_ready`. Implementation not started.

## 2026-09-12 15:38 — leader

**Action:** Spec updated to include RTL integration tests. Status remains `spec_ready`.

## 2026-09-12 15:42 — implementer

**Task:** Git setup + start implementation (T1+)

**Changes:**
- Branch `feat/order-kitchen-queue` created from `develop`
- `feature_list.json` → `in_progress`

**Notes:** Uncommitted harness files preserved (`feature_list.json`, specs/, progress/). No stash required.

## 2026-09-12 15:48 — implementer

**Task:** tasks.md T1–T47 (implementation)

**Changes:**
- `supabase/migrations/20260912160000_order_kitchen_queue.sql` — menu taxonomy, `order_item_sides`, delivery fields, Realtime, role-aware RLS
- `supabase/seeds/order_menu_catalog.sql` + wired in `supabase/seed.sql`
- `src/domains/orders/domain/*` — entities, cart, validations, order-status, repository + Vitest
- `src/domains/orders/application/use-cases.ts` + tests
- `src/domains/orders/infrastructure/*` — Supabase repos, server actions, query adapters, kitchen realtime, in-memory test repos
- `src/domains/orders/presentation/*` — waiter + kitchen UI, formatMoneyUsdEs, RTL harness + integration tests
- `src/app/(app)/orders/page.tsx`, `src/app/(app)/kitchen/page.tsx`
- `src/shared/infrastructure/database/supabase.types.ts` — manual update for new schema
- `src/domains/auth/presentation/providers/session-context.tsx` — test session split
- `docs/database-schema.md`, `docs/supabase.md`
- `vitest.config.ts` — jsdom for `*.integration.test.tsx`
- `package.json` — `@testing-library/*`, `jsdom`

**Verification:**
- `pnpm test` — 102/102 pass (domain + application + RTL integration)
- `pnpm exec tsc --noEmit` — pass
- `pnpm exec eslint src/domains/orders/**/*.{ts,tsx}` — pass (repo root lint still scans `.next`; pre-existing)

**Notes:**
- T15 RPC skipped — sequential inserts in `supabase-order-repo.ts` acceptable for MVP
- MeatPlateSidePicker uses native `<select>` for RTL reliability (same UX in modal)
- Server actions dynamically imported in query adapters to avoid `server-only` in RTL

## Verification table

| Check | Layer | Status |
|-------|-------|--------|
| Cart / validations / order-status | Vitest domain | Pass |
| submitOrder / markOrderReady use cases | Vitest application | Pass |
| Takeaway flow AC-20 | RTL integration | Pass |
| Delivery + fee AC-21/19 | RTL integration | Pass |
| Mark ready AC-22 | RTL integration | Pass |
| es-ES USD display AC-23 | RTL integration | Pass |
| Realtime <3s AC-6 | Manual two-browser | Pending |
| RLS cross-tenant AC-11 | Manual L4 | Pending |
| RBAC route gates AC-9 | Manual browser | Pending |
| Live browser AC-16–18 | Manual | Pending |
| No supabase-js in presentation/app orders | Grep | Pass |

## Manual QA (local)

1. `pnpm dlx supabase db reset`
2. Onboard merchant in app
3. `pnpm db:seed` (or `pnpm dlx supabase db query --local -f supabase/seeds/...` — see `docs/supabase.md`; no `db seed` subcommand)
4. Create waiter + grill_master staff users
5. Waiter: `/orders` — Para llevar or Delivery, add meat + 2 sides, send
6. Grill master: `/kitchen` — ticket appears, Marcar listo removes it
7. Optional: second browser for Realtime without refresh

## Known limitations

- No menu CRUD (seed only)
- No payments / cancel / dine-in UI
- Manual delivery fee entry (no zones catalog)
- Realtime + RLS smoke not run in this session (Docker/browser dependent)

## 2026-09-12 16:05 — reviewer

**Verdict:** fail (changes requested)

**Locked decisions check:**
| Decision | Result |
|----------|--------|
| Takeaway + delivery only (no dine-in UI) | pass |
| Manual delivery fee; optional zone | pass |
| es-ES USD formatting | pass |
| Seed catalog, no menu CRUD | pass |
| Mark ready → `served` (no `ready` status) | pass |
| Realtime + reconnect / polling fallback | **fail** — banner present but connection state always forced `true`; no `refetchInterval: 5000` when not `SUBSCRIBED` (design.md Realtime adapter) |
| RTL via OrdersTestProviders (no `vi.mock` of modules) | pass |
| Hexagonal: no supabase-js in presentation/app | pass |

**Findings:**
- [blocking] `src/domains/orders/infrastructure/query-adapters.ts` (`useKitchenOrdersRealtime`) — sets `isConnected = true` immediately without listening to channel `SUBSCRIBED` / error states; **missing design-required `refetchInterval: 5000` polling fallback** when Realtime is not subscribed. Kitchen can go silently stale with no banner and no poll.
- [major] Same file imports `@/domains/orders/presentation/testing/...` — infrastructure → presentation dependency (layer inversion). Prefer a neutral test seam (e.g. infrastructure/testing or injectable repos) so production adapters do not depend on presentation.
- [major] RLS UPDATE policy allows any column change for `grill_master`/`admin` (not limited to status/`ready_at`). Matches written SQL in design but weaker than OQ-8 intent (“UPDATE status to served”).
- [major] Order insert is non-atomic (sequential inserts; T15 RPC skipped) — orphan risk if item/side insert fails after order row. Documented; acceptable MVP only if leader accepts residual risk.
- [minor] Spec inconsistency: FR-7 allows grill_master submit; OQ-8 / design RLS / use case allow only waiter+admin. Implementation follows OQ-8 (correct vs design SQL); clarify FR-7 with leader/spec_author.
- [minor] AC-7 FIFO sort covered in domain Vitest; RTL does not assert order sequence.
- [minor] `tasks.md` checkboxes still unchecked (expected if specs are frozen); feature_list is `review_pending`.
- [nit] Entire feature still uncommitted on `feat/order-kitchen-queue` (working tree only; no commits ahead of develop).
- [note] Manual T41–T44 (Realtime L2, RLS L4, RBAC L3, live AC-16–18) pending — documented in journal; not sufficient alone to fail if Realtime degraded mode were implemented.

**Automated re-check:** `pnpm test` — 102/102 pass (includes 3 RTL integration scenarios: takeaway, delivery, mark ready).

**Manual verification status:** partial (automated + RTL green; live Realtime/RLS/RBAC/browser pending)

**CHECKPOINTS:** Spec/process OK. Architecture mostly OK (hexagonal boundary for supabase-js held; test-context import smell). Presentation aligns with DESIGN.md Live Order Queue Item (flat, service pill, SLA timer, min 44px). Data/tenancy migration+RLS+seed+docs present. Verification incomplete on manual slices; **blocking design gap on Realtime fallback**.

**Recommendation to leader:** send back to **implementer** — do not mark `done`. After Realtime status + polling fix, re-review; then human manual smoke can remain as follow-up notes if desired (same pattern as raw-materials).

## 2026-09-12 15:58 — implementer (review fix-pass)

**Task:** Reviewer blocking + major fixes

**Changes:**
- `kitchen-realtime.ts` — track `connecting` / `subscribed` / `disconnected` from channel subscribe callback (no forced connected)
- `query-adapters.ts` — `useActiveOrders` uses `refetchInterval: 5000` when Realtime not subscribed; `useKitchenOrdersRealtime` exposes `isSubscribed` / `isReconnecting`
- `KitchenQueueView.tsx` — reconnecting banner when `isReconnecting`; wires polling fallback via shared subscription state
- `supabase/migrations/20260912170000_order_kitchen_review_fixes.sql` — `create_order_with_items` RPC (atomic insert); trigger `orders_enforce_kitchen_update_columns` for status/ready_at-only updates
- `supabase-order-repo.ts` — insert via RPC
- `infrastructure/testing/orders-test-context.tsx` — moved from presentation (fixes layer inversion)
- `kitchen-realtime.test.ts` — unit tests for status callbacks
- `docs/database-schema.md`, `supabase.types.ts` — RPC documented/typed

**Verification:** `pnpm test` — 104/104 pass; `pnpm exec tsc --noEmit` — pass

**Notes:** Manual T41–T44 still pending. Apply new migration: `pnpm dlx supabase db reset`.

## 2026-09-12 15:59 — reviewer

**Verdict:** pass_with_notes (approve)

**Re-check of prior blocking / majors:**
| Prior finding | Result |
|---------------|--------|
| Realtime forced connected + missing `refetchInterval: 5000` | **fixed** — `subscribeActiveOrders` maps SUBSCRIBED → subscribed; CLOSED/CHANNEL_ERROR/TIMED_OUT → disconnected; `useActiveOrders` polls 5s when `realtimeSubscribed === false`; KitchenQueueView banner on `isReconnecting` |
| Infrastructure → presentation test-context import | **fixed** — seam at `infrastructure/testing/orders-test-context.tsx` |
| Kitchen UPDATE any column | **fixed** — trigger `orders_enforce_kitchen_update_columns` (migration `20260912170000_...`) |
| Non-atomic order insert | **fixed** — `create_order_with_items` RPC + repo uses `supabase.rpc` |

**Locked decisions (OQ) spot-check:** OQ-3 takeaway/delivery, OQ-4 mark ready → served, OQ-6 Realtime+fallback, OQ-8 RLS roles, OQ-9 seed, OQ-10 es-ES USD — pass.

**RTL AC-20–23:** Covered by `order-kitchen-flow.integration.test.tsx` (takeaway, delivery+fee, mark ready, Spanish copy + es-ES amounts). Re-ran `pnpm test` — **104/104 pass**.

**Findings:**
- [minor] FR-7 still lists grill_master submit (*); implementation + OQ-8 + RPC deny grill_master insert — clarify with spec_author later; not a regression.
- [nit] Feature tree still largely uncommitted on `feat/order-kitchen-queue` (no commits ahead of develop).
- [note] Manual T41–T44 (live Realtime L2, RLS L4, RBAC L3, browser AC-16–18) remain deferred with reason — code path for Realtime+polling is correct; do not block approve solely on live smoke.

**Manual verification status:** partial (automated + RTL green; live Supabase/browser follow-up)

**CHECKPOINTS:** Spec/process OK. Architecture OK (no supabase-js in orders presentation/app). Data/tenancy: migrations + docs + types updated. Verification: automated requirement met; manual AC deferred with reason in journal.

**Recommendation to leader:** **Approve.** Set `feature_list.json` status to **`done`**. Keep T41–T44 as documented human follow-up (same pattern as prior features). Optionally require a quick human L1 smoke after `supabase db reset` before merge if desired — not required to close the harness gate given `verification: automated` and deferred manual notes.

## 2026-09-12 16:00 — leader

Reviewer approved (`pass_with_notes`); status `done`; branch `feat/order-kitchen-queue`; no commit/push by leader. T41–T44 live Realtime/RLS/RBAC remain optional human follow-up.

## 2026-09-12 16:12 — implementer

**Task:** Fix `supabase db reset` seed failure (psql `\i` meta-commands)

**Changes:**
- `supabase/config.toml` — `[db.seed].sql_paths` now lists `./seeds/dev_raw_materials.sql` and `./seeds/order_menu_catalog.sql` directly
- `supabase/seed.sql` — replaced `\i` includes with comment stub (CLI batch sender does not support psql meta-commands)
- `docs/supabase.md` — document seed wiring via `config.toml`

**Verification:** `pnpm dlx supabase db reset` — pass (migrations + both seed files applied)

## 2026-09-12 16:20 — implementer

**Task:** Fix incorrect `supabase db seed` documentation (CLI 2.117 has no such subcommand)

**Changes:**
- `docs/supabase.md` — document `db query --local -f` for post-onboarding re-seed; clarify seeds run only on `db reset`
- `package.json` — add `db:seed` script (both catalog SQL files)
- `progress/order-kitchen-queue.md`, `progress/raw-materials-inventory.md` — update manual QA commands

**Verification:** `pnpm db:seed` — pass (`INSERT 0 18` / `INSERT 0 14` first run; `INSERT 0 0` on idempotent re-run)

**Notes:** Approved specs still mention `db seed` historically; `docs/supabase.md` is canonical.
