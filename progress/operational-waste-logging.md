# Feature: Operational Waste Logging (Registro de merma)

| Field | Value |
|-------|-------|
| id | operational-waste-logging |
| status | review_pending |
| spec | specs/operational-waste-logging/ |
| verification | automated (domain math; UI/RLS/RBAC remain hybrid/manual at implement time) |

## 2026-09-16 15:26 — leader

**Action:** Human approved `specs/operational-waste-logging/` (explicit approval). Feature recorded in `feature_list.json` as `spec_ready`. Verification set to `automated` for domain math (Vitest). **Not** moved to `in_progress`. Implementer not started. Notion not invoked.

**Locked decisions (spec_author + human):**
- History / “today” calendar day: tenant timezone **America/Caracas** (Venezuela)
- OQs closed as recommended: no waiter; partial stock decrement + warning; route `/waste-log`; RLS `admin` + `grill_master`; calendar today

**Notes:**
- Next step when the user asks: `in_progress` → implementer.
- `dashboard-metrics` stays blocked on this feature; do not start that implementer until waste logs can be written.

## 2026-09-16 16:10 — implementer

**Task:** tasks.md §1–§6 — schema, domain, application, infrastructure, RBAC, presentation

**Changes:**
- `supabase/migrations/20260916160000_operational_waste_logging.sql` — `waste_log` movements, RPC, RLS INSERT tighten
- `src/domains/waste/domain/operational-waste*.ts` — types, validation, calendar day bounds (America/Caracas)
- `src/domains/waste/application/operational-waste-use-cases.ts` — log + list use cases + Vitest
- `src/domains/waste/infrastructure/supabase-operational-waste-repo.ts`, `operational-waste-actions.ts`, `operational-waste-query-adapters.ts`
- `src/app/(app)/waste-log/*`, `OperationalWasteLogView.tsx`, sidebar + rbac `/waste-log`
- `src/shared/infrastructure/database/supabase.types.ts`, `docs/database-schema.md`

**Verification:** Vitest + tsc + lint pending this session; manual L2–L4 pending local db reset / migration apply

**Notes:** Notion not invoked (asadero harness). Manual smoke blocked until migration on local Supabase.

## 2026-09-16 16:12 — implementer

**Task:** tasks.md §7 — verification + journal close

**Changes:**
- Fixed `PROTECTED_APP_ROUTES` to include `/waste-log` before `/waste` (route resolution)
- Removed unused import in `supabase-operational-waste-repo.ts`

**Verification:**
- Vitest: **190/190** passed
- `tsc --noEmit`: pass
- ESLint: pass on touched paths (repo-wide lint includes `.next` noise)

**Tasks (tasks.md):**
- T1–T4: migration + types written; **apply migration locally** still required
- T5–T11: done (Vitest)
- T12–T24: done (code)
- T25: `docs/database-schema.md` updated
- T26: Vitest + tsc done
- T27–T28: **manual pending** (grill_master log, stock, movement; waiter/cross-tenant RLS)
- T29: this journal

**Manual checklist (when Supabase local is up):**
1. `supabase db reset` or apply `20260916160000_operational_waste_logging.sql`
2. Login as `grill_master` → `/waste-log` → log kg → row in “Mermas de hoy”, stock decreases
3. Insufficient stock → partial banner, log still created
4. Waiter → `/waste-log` redirects to `/orders`, no sidebar link
5. Admin → `/waste` costing still separate; cross-link visible on `/waste-log`

**Known limitations:** Browser smoke not run this session (no verified dev login). Dashboard metrics unchanged.

**Status:** Ready for `reviewer`; `feature_list.json` → `review_pending`.

## 2026-09-16 16:04 — leader

**Action:** Status set to `in_progress`. Implementation of `/waste-log` started; implementer launched in parallel by parent. Notion not invoked. `dashboard-metrics` not started. Leader did not edit `src/`.

## 2026-09-16 16:20 — reviewer

**Verdict:** pass_with_notes

**Findings:**
- [process] Manual L2–L4 not run (T27–T28 / AC-1, AC-7, AC-8, AC-9). Migration `20260916160000_operational_waste_logging.sql` must be applied locally before smoke. Do **not** mark `done` until grill_master happy path + stock/movement + waiter deny are exercised, or leader explicitly accepts deferred ACs.
- [optional] `operational-waste.ts` — FR-1 “3 decimal places” is not enforced in Zod (Postgres `DECIMAL(10,3)` will round); consider `.refine` / multipleOf if client-side precision must match.
- [optional] `log_operational_waste` RPC — no max `999.999` guard (domain validates; direct RPC callers could insert larger weights within column limits).
- [optional] `OperationalWasteLogView.tsx` — materials picker has loading but no `isError` empty/error copy (logs history does).
- [nit] RPC skips `inventory_movements` when `applied_kg = 0` (CHECK requires `quantity > 0`); waste_log + `partial: true` still succeed — document as expected edge case for AC-8.
- [nit] `repository.logWaste` receives `actorRole` / `actorUserId` unused (session used inside RPC) — harmless port noise.
- [nit] `tasks.md` checkboxes still unchecked; progress journal is the source of truth.
- [fyi] Client `RoleRouteGate` matches existing `/waste` pattern; real fence is use-case + SECURITY DEFINER role check + tightened INSERT RLS.
- [fyi] Reverse cross-link from `/waste` costing → `/waste-log` is optional in spec; only logging→costing admin link shipped (T24).

**Spec compliance (code review):**
- OQ-1–5 locked decisions reflected: no waiter; partial stock + warning; `/waste-log`; RLS admin+grill_master; calendar today `America/Caracas`
- Hexagonal layers OK; domain pure; presentation via query adapters; nav “Registrar merma” vs “Merma y costos”; kitchen optional link present
- Vitest re-check this review: waste + rbac suites 66/66; implementer claimed full suite 190/190 + tsc

**Manual verification status:** not_run (documented checklist in journal; deferred with reason)

**Recommendation to leader:** Keep `review_pending` (or `in_progress` for smoke). Do **not** set `done` until migration applied + L2/L3 smoke (at least AC-1, AC-7, AC-8, AC-2). No code blockers requiring implementer rewrite before smoke.

## 2026-09-16 16:22 — implementer (manual smoke)

**Task:** T1 apply migration + T27–T28 browser smoke (Chrome DevTools MCP)

**Migration:**
- `pnpm dlx supabase migration up --local` — applied `20260916160000_operational_waste_logging.sql` (no `db reset`)

**Environment:**
- App: `http://localhost:3000` (`pnpm dev` already running)
- Supabase local: up (API `127.0.0.1:54321`)
- Session: existing browser session as `asadero1@gmail.com` (`admin`, tenant asadero1) — no fresh login form (redirected to dashboard when hitting `/login`)

**Browser steps (`/waste-log`):**
1. Open `/waste-log` — page “Registrar merma”, sidebar links **Registrar merma** + **Merma y costos** distinct
2. Log **Carne** 1 kg, reason **Quemado en parrilla** → success “Merma registrada.”; **Mermas de hoy** row at 04:18 p.m.; disponible 69 → 68 kg
3. DB: `raw_materials_inventory` Carne `68.000`; `inventory_movements` `waste_log` qty `1.000`
4. Partial path: SQL set Cochino on-hand `0.500` kg (dev-only tweak); log **Cochino** 2 kg, **Crudo en mal estado** → warning “Se registró la merma, pero el inventario disponible era menor…”; history shows 2.000 kg; disponible 0 kg; movement qty `0.500`
5. Open `/waste` — **Merma y costos** costing grid loads (separate from logging); cross-link from `/waste-log` present

**Console (non-blocking):** a11y label/id issues; Radix Select controlled/uncontrolled warnings — no errors on submit

**AC results:**

| AC | Result | Notes |
|----|--------|-------|
| AC-1 | **Partial / fail role** | Happy path exercised as **admin**, not `grill_master` (no `grill_master` user in local DB) |
| AC-2 | **Not verified** | No local `waiter` user to test redirect / missing nav |
| AC-3 | **Pass** | Admin logged waste + `/waste` costing accessible |
| AC-4–AC-6 | **Pass (Vitest)** | Not re-run this session |
| AC-7 | **Pass** | Full decrement (Carne) + partial warning + capped decrement (Cochino) |
| AC-8 | **Pass** | `inventory_movements.movement_type = waste_log` for both submits |
| AC-9 | **Not verified** | Single-tenant smoke only |
| AC-10 | **Pass** | Four Spanish reason labels in dropdown |
| AC-11 | **Pass** | Picker lists kg insumos only (no count items observed) |
| AC-12 | **Pass** | Nav labels and routes distinct |

**Verification:** Manual L2/L3 partial pass; L4 not run

**Notes for leader:** Do **not** mark `done` until AC-1 with real `grill_master` and AC-2 with `waiter` (create staff + re-smoke). Optional: restore Cochino stock if QA needs prior quantity. `feature_list.json` left `review_pending`.

## 2026-09-16 16:55 — implementer (role smoke T27–T28)

**Task:** Create local QA staff for merchant `asadero1` + browser smoke AC-1 / AC-2

**Staff creation (local only, no db reset):**
- Pattern mirrors production flow in `supabase-staff-repo.ts`: `auth.admin.createUser` (local service role via CLI env) then bind tenant in `public.users`.
- Merchant: same as `asadero1@gmail.com` (`84303c29-8fb1-4584-8cac-b6c3a56abc7c`).
- **grill_master:** `grill1.asadero.qa@gmail.com` — Parrillero QA
- **waiter:** `waiter1.asadero.qa@gmail.com` — Mesero QA
- Passwords: local QA only (same convention as existing admin test user); **not** recorded here.

**Data prep:**
- Restored **Cochino** `quantity_on_hand` to `25.000` kg (was `0` after prior partial smoke).

**Browser smoke (cursor-ide-browser, `http://localhost:3000`):**

| Step | Result |
|------|--------|
| Login `grill1.asadero.qa@gmail.com` → lands `/kitchen`; sidebar: Cocina, Registrar merma, Pedidos — **no** Merma y costos / Personal | Pass |
| `/waste-log` → log Cochino **1.5** kg, Quemado en parrilla → “Merma registrada.”; disponible 25 → 23.5 kg | Pass |
| `/waste` as grill_master → redirected to `/kitchen` (no costing UI) | Pass |
| Login `waiter1.asadero.qa@gmail.com` → `/orders`; sidebar **only** Pedidos | Pass |
| `/waste-log` as waiter → redirected to `/orders` | Pass |
| `/waste` as waiter → redirected to `/orders` | Pass |
| REST `INSERT` on `waste_logs` as waiter JWT → HTTP **403** RLS | Pass |

**DB check:** newest `waste_logs` row `1.500` kg, `burned_on_grill` at `2026-09-16T20:52:50Z` (grill session).

**AC results (this session):**

| AC | Result | Notes |
|----|--------|-------|
| AC-1 | **Pass** | Real `grill_master` happy path + stock decrement |
| AC-2 | **Pass** | Waiter route gate + RLS INSERT deny |
| AC-3 | Pass (prior) | Admin path already smoke-tested |
| AC-7–AC-8 | Pass (prior + grill full decrement) | Partial path still from admin session |
| AC-9 | **Not verified** | Single-tenant only |

**Verification:** Manual L2/L3 role matrix complete for AC-1 and AC-2. L4 cross-tenant still open.

**Notes for leader:** AC-1 and AC-2 now pass; leader may set `done` if AC-9 deferral is acceptable (same as prior reviewer note). Optional follow-up: fix Next.js hydration noise on sidebar/logo in dev overlay. QA users exist in **local** Auth only — delete if unwanted. No commit.

## 2026-09-16 17:00 — implementer

**Task:** UI fix — waste log form row alignment (desktop)

**Changes:**
- `src/domains/waste/presentation/OperationalWasteLogView.tsx` — `md:items-start`; reserved 18px hint row for “Disponible”; invisible label spacer so submit aligns with inputs

**Verification:** Browser smoke blocked (session redirected to `/login`); manual re-check with grill_master session recommended (select Cochino → kilos/motivo stay level with insumo select)

**Notes:** Scoped visual fix only; no spec change.

## 2026-09-16 17:05 — implementer

**Task:** Browser verification — waste log form alignment (desktop 1280px)

**Verification:** **Pass.** Logged in as admin test user; `/waste-log` at 1280×900. Before insumo selected and after **Cochino**: `getBoundingClientRect().top` for `#waste-material`, `#waste-kg`, `#waste-reason`, submit button all **196.67px** (maxDelta **0**). Hint “Disponible: 23.500 kg” at **248.67px** (below select only). Screenshot captured in agent session after selection.

**Notes:** No CSS changes required. Credentials not recorded here.
