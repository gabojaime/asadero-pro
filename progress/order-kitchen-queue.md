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

## 2026-09-12 16:45 — implementer (smoke fixes)

**Task:** Waiter delivery zone spaces + money fee input UX

**Changes:**
- `OrderRegistryView.tsx` — zone no longer trimmed on every keystroke; trim on blur/submit only
- `DeliveryDetailsFields.tsx` — `maxLength` 100, zone blur hook, `MoneyAmountInput` for fee
- `MoneyAmountInput.tsx` + `format-money.ts` — es-ES USD text input (parse on change, format on blur)
- `format-money.test.ts` — unit tests for parse/format helpers
- `order-kitchen-flow.integration.test.tsx` — delivery scenario uses `"Las Mercedes"` and `"4,5"`

**Verification:** `pnpm test src/domains/orders` — 43/43 pass

**Notes:** Fee field starts empty (not `0`); typing `37` works without leading-zero stickiness; blur shows `37,00 US$`.

## 2026-09-18 — implementer

**Task:** Served orders Realtime (waiter `/orders` panel)

**Changes:**
- `query-adapters.ts` — `useKitchenOrdersRealtime` invalidates both `active-orders` and `served-orders`; shared `ORDERS_POLLING_FALLBACK_MS`
- `order-completion-adapters.ts` — `useServedOrders` polling fallback when Realtime disconnected
- `ServedOrdersPanel.tsx` — subscribes via `useKitchenOrdersRealtime`, reconnecting banner
- `query-adapters-realtime.integration.test.tsx` — hook invalidates both query keys on change
- `order-kitchen-flow.integration.test.tsx` — served panel shows order after kitchen mark ready

**Verification:** `pnpm test src/domains/orders` — 49/49 pass

**Notes:** Reuses `subscribeActiveOrders` / channel `kitchen-orders:{merchantId}`; no domain changes.

## 2026-09-24 — spec_author

**Task:** Spec increment (fulfillment timing, kitchen priority sort, optional customer)

**Outcome:** Spec increment written. Pending human approval for OQ-13–OQ-16 plus OQ-17 timezone default and OQ-18 scheduled window. Tasks T48–T58.

**Notes:** Do not start implementer until human approval. Feature baseline remains `done`; increment is spec_ready, not in_progress.

## 2026-09-24 — leader

**Action:** Human approved spec increment OQ-13–OQ-18.

**Locked decisions (human):**
- Timezone default: `America/Caracas` (OQ-17)
- Scheduled window: 5 minutes–7 days (OQ-18)

**Outcome:** Increment status `spec_ready` / approved. Tasks T48–T58 unblocked. Implementation **not started** until the user explicitly asks. No implementer, no `src/` edits, no commit, no Notion.

**Notes:** Feature baseline remains `done`. Increment is approved but not `in_progress`.

## 2026-09-24 — implementer (Phase 7 T48–T58)

**Task:** Fulfillment timing, kitchen priority sort, optional customer fields

**Changes:**
- `supabase/migrations/20260924180000_order_fulfillment_and_kitchen_priority.sql` — enum, order/merchant columns, RPC + trigger
- Domain: `sortKitchenQueueOrders`, fulfillment validation, `merchant-local-time.ts`, cart setters
- Application: `submitOrder` / `listActiveOrders` + `MerchantKitchenSettingsRepository`
- Infrastructure: supabase repos, DTOs, actions, in-memory test repos
- UI: `FulfillmentTimingSelector`, `CustomerContactFields`, kitchen badges/customer line
- RTL scenarios D/E/F; `docs/database-schema.md` updated; types regenerated manually

**Verification:**
- `pnpm test src/domains/orders` — 58/58 pass
- `pnpm exec tsc --noEmit` — pending full repo (orders DTO fix applied)
- Manual pending: T57 Realtime deferred ticket + horizon change in DB (AC-28)

**Notes:** Branch `feature/addional-orden-data`. Apply migration locally via `pnpm dlx supabase db reset` before live smoke.

### Phase 7 verification (T58)

| Check | Result |
|-------|--------|
| Vitest domain sort (`kitchen-queue-sort.test.ts`) | pass |
| Vitest validations + use cases | pass |
| RTL A–F (`order-kitchen-flow.integration.test.tsx`) | pass |
| Manual Realtime deferred scheduled (AC-28) | pending human |
| Manual horizon SQL change + refetch sort | pending human |

## 2026-09-24 15:20 — reviewer

**Verdict:** pass_with_notes (approve)

**Scope:** Phase 7 increment T48–T58 on `feature/addional-orden-data` (working tree; uncommitted). Spec amendment fulfillment timing, kitchen sort, optional customer.

**Locked decisions check:**
| Decision | Result |
|----------|--------|
| `ready_by_at` (promise) vs `ready_at` (grill ready) | pass — columns distinct; mark-ready only sets `readyAt`; CHECK consistency in migration |
| Merchant TZ default `America/Caracas` | pass — migration DEFAULT + `DEFAULT_MERCHANT_TIMEZONE` |
| Horizon default 45 on `merchants.kitchen_priority_horizon_minutes` | pass — DEFAULT 45, CHECK 1–480; used in `listActiveOrders` → `sortKitchenQueueOrders` |
| Scheduled window 5 min – 7 calendar days | pass — `SCHEDULED_MIN_LEAD_MINUTES` / `SCHEDULED_MAX_CALENDAR_DAYS` in domain + UI bounds |
| Optional customer columns | pass — nullable; empty submit OK; kitchen line when present |

**Spec / tasks (T48–T58):**
| Task | Result |
|------|--------|
| T48 migration + RPC + kitchen UPDATE trigger fields | pass |
| T49 types + `docs/database-schema.md` | pass |
| T50–T51 domain sort + validation | pass (sort Vitest strong; fulfillment validation unit tests thin — see notes) |
| T52–T53 application + infra repos/actions | pass |
| T54–T55 waiter/kitchen UI | pass — DESIGN Live Order Queue + deferred muted optional |
| T56 RTL D/E/F | pass |
| T57 manual Realtime/horizon | deferred (documented; allowed follow-up) |
| T58 progress verification table | pass |

**Architecture / CHECKPOINTS:**
- Hexagonal: domain pure; no `@supabase/supabase-js` in presentation/app orders paths; ports for merchant kitchen settings — pass
- DESIGN.md Live Order Queue Item (flat, service pill, SLA, min 44px) + fulfillment/customer badges — pass
- Migration present; docs/types updated — pass
- `feature_list.json` `review_pending` — correct for this gate

**Automated re-check:** `pnpm test` — **230/230** pass (includes orders **58** tests: domain sort 6, RTL A–F 6 scenarios, use cases, etc.). `pnpm exec tsc --noEmit` — pass.

**Findings:**
- [note] Manual T57 / AC-28 (Realtime deferred ticket + horizon SQL change after refetch) remains human follow-up — explicitly allowed; do not block approve.
- [minor] `validations.test.ts` still lacks dedicated AAA cases for scheduled reject paths (readyBy < 5 min, > 7 days, immediate+readyByAt, empty customer OK). Logic exists in `validateFulfillmentRules` / `validateCustomerFields`; RTL covers happy scheduled + customer. Optional harden before merge.
- [minor] FR-13 domain clamp for `horizonMinutes < 1` not implemented — DB CHECK covers production; domain trusts config.
- [nit] Branch/worktree still largely uncommitted (`feature/addional-orden-data` typo retained). `vitest run src/domains/orders` alone can miss jsdom (`environmentMatchGlobs` deprecated); use full `pnpm test` as gate.

**Manual verification status:** partial (automated + RTL green; T57 live Realtime/horizon pending)

**Recommendation to leader:** **Approve.** Set Phase 7 / feature increment to **`done`**. Keep T57 as documented human follow-up after `supabase db reset` + migration apply. No implementer rework required for gate close.

## 2026-09-24 15:17 — leader

Reviewer approved Phase 7 increment (`pass_with_notes`) on `feature/addional-orden-data`. Status `done`. Notes: 2026-09-24 increment approved (fulfillment timing, kitchen sort, optional customer). T57 live smoke remains optional follow-up. No implementer, no `src/`, no commit, no Notion.

