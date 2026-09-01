# Feature: Merchant Onboarding & User Registration

| Field | Value |
|-------|-------|
| id | merchant-onboarding |
| status | spec_ready |
| spec | specs/merchant-onboarding/ |
| verification | manual (pending human confirmation; hybrid Vitest for domain validation documented in spec) |

## 2026-08-25 17:49 — leader

**Action:** Feature added to backlog (`pending`). Notion Kanban not used (asadero-pro).

**Notes:**
- Product source: `docs/business/mvp-features-spec.md` §1. Scope is merchant/tenant onboarding plus linking the existing Auth principal to `merchant_id`. Do not rebuild login/register unless the spec proves a gap.
- Existing Auth: `/login`, `/register`, forgot-password, email OTP. Presentation currently calls Supabase Auth clients directly. Domain/application/infrastructure for `auth` are placeholders.
- Canonical `merchants` / `users` / RLS live in `docs/database-schema.md`. No `supabase/migrations/` files exist yet. Documented RLS has SELECT on `merchants` only; no INSERT bootstrap path. `users.merchant_id` is NOT NULL.
- Leader will launch `spec_author`. Implementer must not start until human approval.
- Verification enum is `manual` pending the human answer (first feature of this session). Recommended: manual for UI/onboarding/RLS smoke; Vitest for pure domain/validation if the spec adds it.

## 2026-08-25 17:55 — leader

**Action:** `spec_author` wrote `specs/merchant-onboarding/{README,requirements,design,tasks}.md`. Status set to `spec_ready`. Waiting for explicit human approval before `in_progress`. Implementer not started. `src/` not edited.

**Notes:**
- Spec maps existing Auth (`/login`, `/register`) vs post-auth `/onboarding` wizard. Proposed bootstrap: `SECURITY DEFINER` RPC (pending Open Question 6).
- Ten open questions in `specs/merchant-onboarding/requirements.md`.
- Verification remains `manual` in `feature_list.json`; hybrid Vitest for domain validations is documented in the spec. Human must confirm `manual` vs `automated`.
- Notion Kanban not used.

## 2026-08-25 20:20 — leader

**Action:** Human resolved all merchant-onboarding open questions. Specs patched in place (no implementer, `src/` untouched). Status remains **`spec_ready`**. Waiting for explicit “implementa / adelante” before `in_progress`.

**Decision lock:**
1. Auth user may exist without `public.users` until onboarding. Incomplete users go to `/onboarding` (+ existing auth routes); `(app)` is blocked.
2. No taxes — do not model RFC/NIT, tax rate, or tax config; no extra columns.
3. Single `merchants.name` (no legal vs public split).
4. Address and phone not required. Schema has neither — do not add columns and do not collect them on the form.
5. Single owner; no invitations.
6. Bootstrap: `SECURITY DEFINER` RPC with `auth.uid()`. Keep `merchant_id` NOT NULL. No ad-hoc service-role from client paths.
7. No restyle of login/register; business fields only on onboarding.
8. Original spec did not recommend blocking on email confirmation (Flow B left it open). **Chosen:** do **not** block onboarding on email confirmation in app code for local/MVP. Keep `/auth/confirm`; optional `emailRedirectTo` → `/onboarding`.
9. Route: `(auth)/onboarding` at `/onboarding`, not `(app)/onboarding`.
10. Server gate: `(app)/layout.tsx` rejects users without merchant; `(auth)/onboarding/layout.tsx` rejects users who already have a merchant. Proxy: session-only, `/onboarding` not public; no `public.users` query in proxy.

**Conflicts resolved:**
- First draft recommended `(app)/onboarding`; human locked `(auth)/onboarding` — README, FR-4/5, design routing, and tasks 5–6 updated.
- Q8 ambiguous — locked to no app-level confirmation gate.
- Address/phone “optional” vs “no columns for later” — interpreted as out of form and schema (not optional nullable columns).
- Proxy vs layout: both documented; merchant check lives in layouts, not proxy.

**Verification:** unchanged (`manual` in `feature_list.json`; hybrid Vitest for domain validations in spec).

## 2026-08-25 20:30 — leader

**Action:** Human revised Q4. [spec_author](aed0db43-17c1-4b32-8d45-222aa7112db5) patched `specs/merchant-onboarding/` in place. Status remains **`spec_ready`**. Implementer not started. `src/` not edited.

**Q4 revision:**
- Previous lock: omit address/phone (no columns, not on form).
- New lock: columns **must exist**, **nullable**; form fields **optional**; submit allowed empty; omitted/blank persist as **NULL**.
- Canonical `docs/database-schema.md` `merchants` currently has only `id`, `name`, `created_at`. Spec adds migration (implementer also updates the canonical doc).

**Column names chosen:** `merchants.address VARCHAR(255)` nullable, `merchants.phone VARCHAR(255)` nullable (English names, same VARCHAR style as `name`/`email`/`full_name`). RPC args `p_address` / `p_phone` with DEFAULT NULL. No tax columns. Single `merchants.name` unchanged.

**Spec files updated:** README lock #4, FR-2/FR-9/FR-10, AC-14–16, design form + RPC + ALTER TABLE, tasks migration + optional form fields.

**Unchanged:** Q1–Q3, Q5–Q10; verification still `manual` in `feature_list.json`.

## 2026-08-25 20:48 — implementer

**Task:** Start implementation — tasks.md §1–8

**Changes:**
- `feature_list.json` — status `in_progress`
- Beginning migration, domain, UI, and route guards per approved spec

**Verification:** pending

**Notes:** Progress journal tracks task checkboxes (spec files not edited).

## 2026-08-25 20:51 — implementer

**Task:** tasks.md §1 — Migration specification

**Changes:**
- `supabase/migrations/20260825204800_initial_schema_and_onboarding.sql` — full DDL, RLS, `get_user_merchant_id()`, RPC with optional `p_address`/`p_phone`, grants
- `docs/database-schema.md` — nullable `merchants.address`/`phone`, onboarding RPC section
- `src/shared/infrastructure/database/supabase.types.ts` — manual types (Docker unavailable for `gen types`)

**Verification:** Migration **not applied locally** — Docker/Podman not installed on this machine. Run manually (see summary).

**Notes:** §1 checkboxes: migration file done; `db reset` + `gen types` pending on developer machine.

## 2026-08-25 20:52 — implementer

**Task:** tasks.md §2–3 — Merchants domain + infrastructure

**Changes:**
- `src/domains/merchants/domain/{entities,validations,validations.test,repository,errors}.ts`
- `src/domains/merchants/application/{use-cases,use-cases.test}.ts`
- `src/domains/merchants/infrastructure/{supabase-repo,query-adapters}.ts`

**Verification:** `pnpm test` — 10 tests passed (validations + use cases)

## 2026-08-25 20:52 — implementer

**Task:** tasks.md §4 — Auth session profile

**Changes:**
- `src/domains/auth/domain/{entities,repository}.ts`
- `src/domains/auth/application/{use-cases,use-cases.test}.ts`
- `src/domains/auth/infrastructure/{supabase-repo,session-profile-server,query-adapters}.ts`

**Verification:** typecheck passes; server helper usable from layouts

## 2026-08-25 20:53 — implementer

**Task:** tasks.md §5–6 — Onboarding UI + route guards

**Changes:**
- `src/domains/merchants/presentation/components/onboarding-form.tsx` — DESIGN.md flat card, 4 fields, Spanish copy
- `src/app/(auth)/onboarding/{page,layout}.tsx` — view + server gate
- `src/app/(app)/layout.tsx` — session + onboarded gate
- `src/domains/auth/presentation/components/sign-up-form.tsx` — `emailRedirectTo` → `/onboarding`
- `proxy.ts` unchanged — `/onboarding` already requires session (not in public allowlist)

**Verification:** Browser smoke **not run** (no local Supabase + dev server). Manual checklist below.

## 2026-08-25 20:54 — implementer

**Task:** tasks.md §8 — Quality gates

**Changes:**
- `vitest.config.ts`, `package.json` — Vitest + `pnpm test` script

**Verification:**
- `pnpm exec tsc --noEmit` — pass
- `pnpm test` — 10/10 pass
- `pnpm lint` — fails on pre-existing `.next/` generated files (not introduced by this feature)
- Grep: no `@supabase/supabase-js` in merchants presentation or onboarding routes
- No `(app)/onboarding` route

---

## Task checklist (from tasks.md)

| § | Status |
|---|--------|
| 1 Migration file + doc update | Done (local apply pending Docker) |
| 2 Merchants domain + tests | Done |
| 3 Merchants application + infra | Done |
| 4 Auth session profile | Done |
| 5 Onboarding UI | Done |
| 6 Route guards | Done |
| 7 E2E smoke + RLS | **Pending manual** (needs Docker + Supabase) |
| 8 Quality gates | Done (lint pre-existing noise) |
| 9 Deferred | N/A |

---

## Manual verification checklist (for reviewer / human)

1. Install Docker Desktop; run `pnpm dlx supabase start` then `pnpm dlx supabase db reset`
2. Regenerate types: `pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts`
3. Register new user → login → land on `/onboarding` via `(app)` redirect
4. Complete onboarding with/without address/phone → `/dashboard`
5. Revisit `/onboarding` when onboarded → redirect `/dashboard`
6. Visit `/inventory` without profile → redirect `/onboarding`
7. Unauthenticated `/onboarding` → redirect `/login`
8. Second RPC call → graceful redirect (already onboarded)
9. Login/register styling unchanged
10. Optional RLS: user A cannot read merchant B data

## Known limitations

- Types file is hand-written until local `gen types` runs after migration apply
- Browser E2E and RLS smoke not executed in this session (no Docker)
- `pnpm lint` reports thousands of errors from `.next/` — pre-existing scaffold issue

## 2026-08-25 20:55 — reviewer

**Verdict:** pass_with_notes

**Findings:**
- [important] tasks.md §7 / AC manual — Migration apply, `gen types`, browser E2E, and RLS smoke were **not run** (no Docker). Checklist documented; blocks marking `done` until a human confirms the manual list (or explicitly accepts residual risk). `pnpm test` 10/10 and `tsc --noEmit` pass in this review.
- [important] `src/domains/merchants/presentation/components/onboarding-form.tsx:81` — Card keeps default primitive `shadow` from `shared/presentation/ui/card.tsx`. Spec `design.md` UI requires a flat card with **no** drop shadow; add `shadow-none` (AC-8 only bans `shadow-lg`/`shadow-xl`, but design text is stricter).
- [important] `src/domains/auth/infrastructure/query-adapters.ts:10` — `useSessionProfile` uses query key `['session-profile']` instead of FR-7 / design `['session-profile', userId]`. Invalidation partially compensates via broad prefix + helper; still a conventions/spec miss.
- [important] `docs/database-schema.md:22` — Prose about address/phone was inserted **inside** the DDL SQL fence, breaking the canonical SQL block. Also `users.id` still documents `DEFAULT uuid_generate_v4()` while migration correctly uses `id UUID PRIMARY KEY` (no default) for `auth.uid()` binding.
- [nit] `supabase/migrations/...sql` `get_user_merchant_id()` — `SECURITY DEFINER` without `SET search_path = public` (bootstrap RPC correctly sets it; matches current docs snippet; harden when touching RLS helpers).
- [nit] Shared `Button` uses `font-medium` (weight 500) — DESIGN.md forbids 500; scaffold debt; onboarding correctly avoided restyling login/register.
- [nit] Onboarding uses existing `LogoutButton` with English "Logout" label (FR-11 allows existing control).
- [nit] Progress journal lacks the formal AC verification table from `docs/verification.md` (manual checklist present instead).

**Spec / architecture checklist (reviewer):**
- Locked decisions 1–10: reflected (auth-only interim, no taxes, single name, nullable address/phone → NULL, single owner, SECURITY DEFINER RPC, no login restyle, no email-confirm app gate, `(auth)/onboarding`, layout gates vs proxy session-only).
- Hexagonal: no `@supabase/supabase-js` in merchants presentation or onboarding routes; app layouts use `getServerSessionProfile`; infra repos only. Pre-existing `auth/confirm` type import and login/register direct clients deferred per spec.
- Proxy: `/onboarding` not in public allowlist; no `public.users` query.
- Domain validations + use-case tests: covered (empty, whitespace, optional null, max length, already onboarded).
- Deferred §9 items correctly not implemented.

**Manual verification status:** not_run (documented deferral: Docker unavailable)

**Leader guidance:** Do **not** set `done` until human completes (or explicitly waives) the manual checklist in this journal. Optional short implementer pass for Card `shadow-none`, session-profile query key, and `docs/database-schema.md` fence fix — not required to clear a `fail`, but recommended before `done`.

## 2026-09-01 — implementer (local Supabase)

**Task:** Apply local migrations and regenerate types after Docker Desktop became available.

**Changes:**
- Ran `pnpm dlx supabase start` (local Docker stack). First start also applied `20260825204800_initial_schema_and_onboarding.sql`.
- Ran `pnpm dlx supabase db reset` (fresh local MVP; seed.sql not present).
- Regenerated `src/shared/infrastructure/database/supabase.types.ts` with `pnpm dlx supabase gen types typescript --local` (includes `create_merchant_and_admin_profile` and `get_user_merchant_id`).

**Verification:** `pnpm test` run in the same session (see following journal if results differ). Manual UI/RLS smoke still for the human.

**Notes:**
- Do not commit `.env.local`. Local Studio/API URLs and keys come from `supabase start` output only.
- Existing `.env.local` still pointed at the hosted project URL at the time of this note; switch to local URL + publishable key before browser smoke.
**Verification (follow-up):** `pnpm test` failed in this environment (incomplete local `vitest`/`vite` install under `.pnpm`; not a domain-test failure). Types file regenerated successfully.

## 2026-09-01 — fix: `/` 404 (root `app/` shadowed `src/app/`)

**Note:** A leftover root-level `app/` directory (only `favicon.ico`) took precedence over `src/app/`, so Next.js registered no routes and every path returned 404; moved favicon to `src/app/` and removed the empty root `app/` folder (not caused by onboarding proxy/layout logic).

## 2026-09-01 17:10 — implementer (session-profile dev errors)

**Task:** Debug `session-profile-server.ts` runtime errors in Next.js 16 dev (`cacheComponents: true`).

**Root cause:** `(app)/layout.tsx` and `(auth)/onboarding/layout.tsx` called `getServerSessionProfile()` at the layout root. That reads `cookies()` via `createClient()` during prerender without a `<Suspense>` boundary, triggering Next.js 16 `blocking-prerender-runtime`.

**Changes:**
- `src/domains/auth/presentation/components/protected-session-gate.tsx` — auth + onboarding redirect gate (server component)
- `src/domains/auth/presentation/components/onboarding-session-gate.tsx` — onboarding-only gate
- `src/app/(app)/layout.tsx` — wrap children in `<Suspense>` + `ProtectedSessionGate`; `export const instant = false`
- `src/app/(auth)/onboarding/layout.tsx` — `<Suspense>` + `OnboardingSessionGate`; `export const instant = false`
- `src/app/(app)/dashboard/page.tsx`, `src/app/(auth)/onboarding/page.tsx` — `export const instant = false`
- `session-profile-server.ts` unchanged (logic was correct; call site was wrong)

**Verification:** Fresh `pnpm dev`; `GET /`, `/dashboard`, `/onboarding` no longer emit `blocking-prerender-runtime`. Prefetch `instant` validation noise cleared after page-level `instant = false`.

**Notes:** Hexagonal boundary preserved — Supabase stays in infrastructure; presentation gates call the server helper only.

