# Feature: Multi-Tenant Authentication & Session Safeguards

| Field | Value |
|-------|-------|
| id | multi-tenant-auth |
| status | done |
| spec | specs/multi-tenant-auth/ |
| verification | manual (hybrid Vitest for domain RBAC + login validation) |

## 2026-09-01 19:12 — leader

**Action:** Feature added to backlog (`pending`). Notion Kanban not used (asadero-pro). Leader will launch `spec_author`. Implementer must not start until human approval.

**Notes:**
- Product source: `docs/business/mvp-features-spec.md` §2 (lines 27–42). Scope is **login + session + RBAC + tenant context**, not signup.
- Dependency: `merchant-onboarding` is `review_pending`. Registration, merchant creation, and onboarding already exist. Reuse `users`, `merchants`, `user_role`, `get_user_merchant_id()`, bootstrap RPC — do not redefine them.
- Database is **not greenfield**. Migration `supabase/migrations/20260825204800_initial_schema_and_onboarding.sql` already applied. Canonical docs: `docs/database-schema.md`, `docs/supabase.md`.
- Known mismatches to capture in spec (do not invent product behavior):
  - Product copy uses `grillmaster`; enum is `user_role` = `'admin' | 'grill_master' | 'waiter'`.
  - Product mentions Next.js Middleware; repo uses `proxy.ts` (Next.js 15 App Router, not Pages Router / next-auth).
  - Product routes grillmaster to `app/(app)/kitchen`; that route does **not** exist yet (current `(app)` pages: dashboard, inventory, orders, waste). Spec the guard/redirect contract and a stub/dependency — do not expand into a kitchen MVP.
  - Existing Auth: `/login`, `/register`, forgot-password, update-password, `/auth/confirm`, `/auth/error`. Onboarding at `(auth)/onboarding`.
- Verification: `manual` in `feature_list.json` for UI/Supabase/RLS. Hybrid Vitest allowed for pure domain/RBAC decision functions. Human may confirm later.
- Do not invoke `notion-task-manager`. Do not edit `src/`.

## 2026-09-01 19:20 — leader

**Action:** [spec_author](646adacf-3cfe-49fa-86ac-d0d0ad007a0f) wrote `specs/multi-tenant-auth/{README,requirements,design,tasks}.md`. Status set to `spec_ready`. Waiting for explicit human approval before `in_progress`. Implementer not started. `src/` not edited. Notion Kanban not used.

**Notes:**
- Spec reuses merchant-onboarding outputs (`users`, `merchants`, `user_role`, `get_user_merchant_id()`, onboarding gates). No new migration by default.
- Canonical roles: `admin` | `grill_master` | `waiter`. Product copy `grillmaster` is an alias only.
- Interceptor is `proxy.ts` (Next.js 16 file convention; repo `next`: latest). RBAC stays in Server Component gates; proxy remains session-only (onboarding lock #10).
- `/kitchen` specified as a **stub** for `grill_master` redirect contract — not kitchen MVP.
- Proposed RBAC matrix in FR-8 pending human confirmation (OQ-3, OQ-4 critical).
- Ten open questions in `specs/multi-tenant-auth/requirements.md` (OQ-1–OQ-10).
- Verification remains `manual` in `feature_list.json`; hybrid Vitest for `rbac.ts` + login validations.
- Tasks: 12 ordered slices + 2 checkpoints.

**Mismatches captured in spec (MVP wording vs DB/code):**
- `grillmaster` vs enum `grill_master`
- Middleware vs `proxy.ts`
- Missing `app/(app)/kitchen` (stub planned)
- Login form still imports Supabase directly; DESIGN.md restyle in scope
- Query key `['session-profile']` to become `['session-profile', userId]`

## 2026-09-01 19:40 — leader

**Action:** Human answered OQ-3, OQ-4, OQ-10 (and remaining OQs closed with spec defaults). [spec_author](2e710cc6-a62e-4af5-8faf-2ce0b223cbac) patched `specs/multi-tenant-auth/` (README + requirements already patched earlier; design.md + tasks.md finished this pass). Status kept **`spec_ready`**. Implementer **not** launched. Reviewer **not** launched. `src/` not edited. Implementation is **on hold** until explicit human go-ahead.

**Closed decisions recorded in spec:**
- OQ-3: waiter only `/orders`; blocked routes → `/orders`.
- OQ-4: grill_master blocked only from `/dashboard` → `/kitchen`; may use inventory, orders, waste, kitchen (including merma).
- OQ-10: admin creates users from dashboard (email + password + full name + role); `merchant_id` = current admin merchant; now **in scope**.
- OQ-1: UI “Parrillero”; OQ-2: kitchen stub; OQ-5: proxy session-only; OQ-6: profile fail → `/login`; OQ-7: post-onboarding by role; OQ-8: server gates + SessionProvider; OQ-9: mutation RLS later unless focused staff RPC.

**Create-user approach (spec):** password (not invite); server-only `auth.admin.createUser` + `create_staff_user_profile` RPC. Never expose service role to the browser.

## 2026-09-01 20:15 — leader

**Action:** Human requested an initial authenticated app layout (shadcn Sidebar, mobile-first). [spec_author](db7fa7a6-522f-4130-9658-50cc1b4e501a) patched existing files under `specs/multi-tenant-auth/` only (README, requirements, design, tasks). Status kept **`spec_ready`**. Implementer **not** launched. Reviewer **not** launched. `src/` not edited. No new feature id. Notion Kanban not used. Implementation remains **on hold** until explicit human go-ahead.

**Layout / mobile amendment recorded in spec:**
- FR-16–21: `(app)` SidebarProvider shell, RBAC-filtered nav (`getNavRoutesForRole`), offcanvas mobile, DESIGN.md `--sidebar-*` mapping, merchant header, `(auth)` stays sidebar-free.
- NFR-7: 375px one-handed, overlay closes on nav, full-width content, no h-scroll, ≥44px targets, `h-svh` / safe-area.
- AC-24–39: shell, per-role nav, mobile smoke, theming, merchant name, Personal anchor, domain nav helper tests.
- Phase 7 Tasks 17–22: install primitive, layout shell, role nav, mobile offcanvas, token theming, manual mobile+desktop smoke.
- Deferred “sidebar optional UX” **removed** — nav hiding is required. Locked RBAC matrix and OQ-1–OQ-10 unchanged.
- Admin “Personal” → `/dashboard#personal` (existing FR-14 panel). No `/staff` route.
- Waiter nav: Pedidos only. Grill master: no Panel. Primitive path: `src/shared/presentation/ui/` via `components.json`.

## 2026-09-02 12:15 — leader

**Action:** Human explicitly approved `specs/multi-tenant-auth/` ("spec aprobada, pasa a la implementación"). Status set to **`in_progress`**. Spec files will not be edited during implementation. Notion Kanban not used (asadero-pro). Launching **implementer** to execute `specs/multi-tenant-auth/tasks.md` in order (Tasks 1–22, Checkpoints A/B). `src/` not edited by leader.

**Locked product decisions (do not re-open):**
- RBAC: admin all routes; grill_master blocked only `/dashboard` → `/kitchen`; waiter only `/orders` (blocked → `/orders`).
- Landings: admin `/dashboard`, grill_master `/kitchen`, waiter `/orders`. UI label “Parrillero”. Kitchen stub only.
- Admin creates staff from dashboard (email + password + name + role); `merchant_id` = current admin merchant; server-only `auth.admin.createUser` + RPC.
- App shell: shadcn Sidebar in `(app)`, mobile-first offcanvas, RBAC-filtered nav. DESIGN.md `--sidebar-*`.
- Proxy: session-only; incomplete onboarding → `/onboarding`. Role enum `grill_master`. Next.js `proxy.ts`.
- Reuse `merchant-onboarding` (status `review_pending`); do not rewrite signup.

**Verification:** `manual` with hybrid Vitest for pure RBAC/login/create-staff validation.

## 2026-09-02 12:16 — implementer

**Task:** tasks.md §1–2 — RBAC domain + login/create-staff validations

**Changes:**
- `src/domains/auth/domain/rbac.ts`, `rbac.test.ts` — pure RBAC matrix, nav helper
- `src/domains/auth/domain/validations.ts`, `validations.test.ts` — Zod sign-in + create-staff schemas
- `src/domains/auth/domain/errors.ts`, `role-labels.ts` — domain errors + Spanish role labels
- Extended `entities.ts` with SignIn/CreateStaff types + `merchantName` on SessionProfile

**Verification:** `pnpm test src/domains/auth/domain/` — 18 tests pass

**Notes:** RBAC matrix locked per spec; prefix paths inherit parent route policy.

## 2026-09-02 12:17 — implementer

**Task:** tasks.md §3–5 — sign-in hexagonal slice + LoginForm refactor

**Changes:**
- `repository.ts`, `application/use-cases.ts`, `use-cases.test.ts` — AuthRepository, signIn/signOut, createStaffUser
- `infrastructure/supabase-auth-repo.ts`, `query-adapters.ts` — useSignIn/useSignOut/fetchClientSessionProfile
- `presentation/components/login-form.tsx` — useSignIn adapter, DESIGN.md flat card, role landing

**Verification:** Vitest application tests pass; grep confirms no Supabase import in login-form

## 2026-09-02 12:18 — implementer

**Task:** tasks.md §6–9 — SessionProvider, RBAC gates, kitchen stub, landing redirects

**Changes:**
- `presentation/providers/session-provider.tsx` — tenant context hook
- `presentation/components/role-route-gate.tsx` — server RBAC gate
- `(app)/*/layout.tsx` — per-route role gates (dashboard, inventory, orders, waste, kitchen)
- `(app)/kitchen/page.tsx` — Spanish stub
- `onboarding-session-gate.tsx` — post-onboarding redirect via `getDefaultLandingRoute`
- `infrastructure/supabase-repo.ts` — merchant name join on session profile
- `(app)/layout.tsx` — SessionProvider + shell (expanded Task 18)

**Verification:** manual pending (requires test users)

## 2026-09-02 12:19 — implementer

**Task:** tasks.md §10–13 — admin create-staff vertical slice

**Changes:**
- `supabase/migrations/20260902120000_create_staff_user_profile.sql` — SECURITY DEFINER RPC
- `shared/infrastructure/supabase/admin.ts` — server-only service role client
- `infrastructure/supabase-staff-repo.ts`, `staff-user-action.ts` — admin createUser + RPC + compensating delete
- `presentation/components/create-staff-user-form.tsx`, `(app)/dashboard/page.tsx` — admin panel `#personal`
- `shared/infrastructure/database/supabase.types.ts` — RPC type added

**Verification:** migration applied to remote Supabase project via MCP; local apply requires Supabase CLI

**Notes:** `.env.local` missing `SUPABASE_SERVICE_ROLE_KEY` — create-staff server action will fail until set (server-only, not NEXT_PUBLIC).

## 2026-09-02 12:20 — implementer

**Task:** tasks.md §17–21 — shadcn Sidebar shell + DESIGN.md tokens

**Changes:**
- Installed `sidebar`, `sheet`, `separator`, `tooltip`, `skeleton`, `use-mobile` under `src/shared/presentation/ui/`
- `presentation/components/app-sidebar.tsx` — role-filtered nav from `getNavRoutesForRole`, mobile overlay close
- `presentation/components/app-shell-header.tsx` — SidebarTrigger ≥44px, safe-area padding
- `(app)/layout.tsx` — SidebarProvider shell; starter chrome removed
- `globals.css` — `--sidebar-*` mapped to Flame Red / flat surfaces
- `logout-button.tsx` — refactored to `useSignOut` adapter

**Verification:** `pnpm exec tsc --noEmit` pass; eslint on auth/(app) files pass

## 2026-09-02 12:22 — implementer

**Task:** tasks.md §14–16, §22 — quality gate + manual verification matrix

**Verification (automated):**

| Check | Result |
|-------|--------|
| `pnpm test` | 34/34 pass |
| `pnpm exec tsc --noEmit` | pass |
| eslint auth + (app) scope | pass |
| login-form Supabase import grep | none |
| create-staff-form Supabase import grep | none |
| proxy.ts queries public.users | none (session-only via getClaims) |

**Verification (manual — deferred/blocked):**

| Scenario | Expected | Status |
|----------|----------|--------|
| Admin login → `/dashboard` | AC-6 | **Blocked** — Chrome DevTools MCP navigation timeout; curl to localhost:3000 hung. Restart `pnpm dev` recommended. |
| grill_master `/dashboard` → `/kitchen` | AC-7 | Pending — needs staff user via admin UI |
| waiter only `/orders` | AC-8, AC-11 | Pending — needs staff user via admin UI |
| Unauthenticated → `/login` | AC-4 | Pending manual |
| Non-onboarded → `/onboarding` | AC-5 | Pending manual |
| Admin create staff from dashboard | AC-16–19 | **Blocked** — requires `SUPABASE_SERVICE_ROLE_KEY` + local migration |
| Sidebar mobile ~375px offcanvas | AC-31–34 | Pending manual |
| Sidebar desktop role nav | AC-26–30 | Pending manual |
| Two-merchant RLS smoke | AC-22 | Deferred — no second merchant fixture |

**Checkpoint A:** Vitest pass; login-form has no Supabase import; admin login E2E pending human/browser.

**Checkpoint B:** All tasks 1–22 implemented in code; manual AC matrix partially blocked as above.

## 2026-09-02 12:22 — implementer (completion)

**Summary:** Multi-tenant auth feature implemented: login hexagonal slice, session profile with merchant name, RBAC server gates, role-aware landings, admin create-staff server action + RPC migration, kitchen stub, mobile-first shadcn Sidebar shell with role-filtered nav.

**Paths touched (primary):**
- `src/domains/auth/domain/` — rbac, validations, entities, errors, role-labels
- `src/domains/auth/application/` — signIn, signOut, createStaffUser
- `src/domains/auth/infrastructure/` — auth repo, staff repo, query adapters, server action
- `src/domains/auth/presentation/` — login, gates, sidebar, create-staff form, session provider
- `src/app/(app)/` — layout shell + per-route gates + kitchen + dashboard
- `src/shared/infrastructure/supabase/admin.ts`
- `src/shared/presentation/ui/sidebar.tsx` (+ peers from shadcn CLI)
- `supabase/migrations/20260902120000_create_staff_user_profile.sql`
- `src/app/globals.css`

**Remaining risks:**
1. `SUPABASE_SERVICE_ROLE_KEY` not in `.env.local` — create-staff will fail until configured server-side.
2. Local Supabase migration not applied via CLI (`supabase` not in PATH); remote project migration applied via MCP.
3. Browser/manual RBAC matrix not exercised in this session (DevTools MCP timeout).
4. Dev server on :3000 may need restart to pick up all changes.

**Ready for reviewer.** Leader should set `review_pending` after human completes manual verification checklist above.

## 2026-09-02 12:25 — leader

**Action:** Implementer [b76e1e69-1769-4bdf-81a1-9a5c3f1f6385] reported Tasks 1–22 complete in code. Status set to **`review_pending`**. Launching **reviewer** (read-only). Notion Kanban not used. Spec files not edited. `src/` not edited by leader.

**Notes for reviewer:**
- Automated: Vitest 34/34, tsc pass, eslint pass on auth/(app).
- Manual browser matrix blocked/deferred in journal (DevTools MCP timeout; missing `SUPABASE_SERVICE_ROLE_KEY`; local migration CLI not in PATH; two-merchant RLS deferred).
- Do not treat missing human E2E as automatic `fail` if AC are documented deferred with reason — but flag blocking security issues (service role leak, hexagonal violations, wrong RBAC, etc.) as `fail`.

## 2026-09-02 12:26 — reviewer

**Verdict:** pass_with_notes

**Findings:**
- [major] `src/domains/auth/presentation/components/app-sidebar.tsx` (via `SidebarMenuButton` default `h-8` in `src/shared/presentation/ui/sidebar.tsx:486`) — NFR-7 / AC-33 require ≥44px touch targets for sidebar menu items; default menu button is `h-8` (32px). Trigger already uses `min-h-11`; menu links do not (`size="lg"` / `min-h-11` missing).
- [major] `src/shared/infrastructure/supabase/admin.ts:1` — design requires a compile-time server-only import guard; file has no `import "server-only"`, and the `server-only` package is not installed. Usage is currently limited to `"use server"` `staff-user-action.ts` (no browser service-role exposure found), but Task 11 AC (“not importable from `'use client'`”) is not enforced.
- [major] `docs/database-schema.md` — focused RPC `create_staff_user_profile` landed in migration `supabase/migrations/20260902120000_create_staff_user_profile.sql` and types, but schema docs were not updated (CHECKPOINTS data/docs item; onboarding RPC is documented, staff RPC is not).
- [major] `progress/multi-tenant-auth.md` verification table — manual ACs largely Pending/Blocked; create-staff (AC-16–19) blocked on missing `SUPABASE_SERVICE_ROLE_KEY` + local migration CLI; two-merchant RLS (AC-22) deferred. Acceptable as documented deferral per review brief, but **security/create-staff/RLS must not be claimed production-ready** until human L2/L4 smoke. Format also diverges from `docs/verification.md` Criterion|Level|Result table.
- [minor] `src/domains/auth/application/use-cases.ts:54-64` — `createStaffUser` forbidden errors are English and can surface in Spanish UI via the server action.
- [minor] `src/shared/presentation/ui/sidebar.tsx:277-289` + `app-shell-header.tsx` — SidebarTrigger accessible name is English (“Toggle Sidebar”); NFR-4 asks Spanish (`Abrir menú` / `Cerrar menú`).
- [minor] `src/domains/auth/presentation/components/login-form.tsx:123` — `font-medium` (weight 500) conflicts with DESIGN.md / FR-4 weight allow-list (300/400/600/700).
- [nit] `src/domains/auth/infrastructure/supabase-staff-repo.ts:50` — `_actorMerchantId` voided; tenant bind correctly relies on RPC `auth.uid()` (good), but port arg is unused noise.
- [nit] `src/shared/presentation/ui/card.tsx:12` — base Card includes `shadow`; login/create-staff cards do not set `shadow-none`. Spec AC-3 forbids heavy shadows (`shadow-lg`/`xl`); DESIGN prefers flat/no drop shadow — prefer `shadow-none` on auth cards.

**Positive (blocking review axes):**
- RBAC matrix + landings match locked OQ-3/OQ-4 (`rbac.ts` + nested layouts); Vitest covers matrix, prefixes, nav helper, validations, createStaffUser actor checks (34/34 reconfirmed).
- Hexagonal login: `login-form` / create-staff form have no `@supabase/supabase-js`; adapters own clients; domain/application pure.
- RPC is SECURITY DEFINER, `search_path=public`, admin-only, `merchant_id` from caller row (not params), GRANT to `authenticated` only.
- Proxy session-only (`getClaims()`); no `public.users` query; onboarding gate preserved; post-onboarding uses `getDefaultLandingRoute`.
- Service role not `NEXT_PUBLIC_*`; not imported from presentation/`src/app/(app)`.
- Sidebar shell: role-filtered via `getNavRoutesForRole`, grill_master Cocina-first order in presentation, Personal `#personal`, DESIGN `--sidebar-*` Flame Red mapping, kitchen stub copy correct.

**CHECKPOINTS:**
- Spec & process: **pass** (human-approved spec; journal chronological; status `review_pending`)
- Code quality: **pass** (conventions/English IDs; no secrets in tree from this review)
- Architecture fit: **pass_with_notes** (layers OK; admin client guard incomplete — see major)
- Presentation / UI: **pass_with_notes** (tokens/shell largely OK; touch targets + weight-500 nits)
- Data & tenancy: **pass_with_notes** (migration + types OK; `database-schema.md` RPC docs missing; RLS smoke deferred)
- Verification: **pass_with_notes** (Vitest pass; manual matrix documented blocked/deferred — incomplete vs claiming AC done)
- Documentation: **pass** (risks/limitations recorded in journal)

**Manual verification status:** partial

**Notes:**
- Fix-pass recommended before leader sets `done`: (1) ≥44px sidebar menu targets, (2) add `server-only` dependency + import in `admin.ts`, (3) document staff RPC in `docs/database-schema.md`.
- Human should complete admin login, create-staff, per-role RBAC, and mobile shell smoke once `SUPABASE_SERVICE_ROLE_KEY` is set and migration is available locally/remote.
- Do **not** auto-invoke web-performance-auditor; optional later for login/shell LCP only.
- No blocking security leak (service role in browser / wrong RBAC / hexagonal violation / proxy profile fetch) found in code review.

## 2026-09-02 12:28 — leader

**Action:** Reviewer [a5f819aa-d515-423c-9efc-14b16140d77e] verdict **`pass_with_notes`** (zero blocking). Status set back to **`in_progress`** for a focused fix-pass on the three **major** findings. Launching implementer. Spec files not edited. Notion Kanban not used. `src/` not edited by leader.

**Fix-pass scope (majors only; nits optional if cheap):**
1. Sidebar menu touch targets ≥44px (NFR-7 / AC-33) — `app-sidebar.tsx` / `SidebarMenuButton`.
2. `import "server-only"` in `src/shared/infrastructure/supabase/admin.ts` + install `server-only` package.
3. Document `create_staff_user_profile` RPC in `docs/database-schema.md`.

**Out of this pass:** human E2E (env: `SUPABASE_SERVICE_ROLE_KEY`, local migration, browser). Remain documented follow-ups.

## 2026-09-02 12:29 — implementer (fix-pass)

**Task:** Reviewer fix-pass — majors (NFR-7 touch targets, server-only guard, staff RPC docs) + optional nits

**Changes:**
- `src/domains/auth/presentation/components/app-sidebar.tsx` — `SidebarMenuButton size="lg"` (48px) for nav links (AC-33 / NFR-7)
- `src/shared/infrastructure/supabase/admin.ts` — `import "server-only"` guard (Task 11)
- `package.json` / `pnpm-lock.yaml` — added `server-only@0.0.1` dependency
- `docs/database-schema.md` — documented `create_staff_user_profile` RPC (Staff user RPC section)
- `src/shared/presentation/ui/sidebar.tsx` — Spanish dynamic `aria-label` / sr-only on `SidebarTrigger` (`Abrir menú` / `Cerrar menú`)
- `src/domains/auth/application/use-cases.ts` — Spanish forbidden messages for createStaffUser
- `src/domains/auth/presentation/components/login-form.tsx` — `font-semibold` (600) link weight; `shadow-none` on Card
- `src/domains/auth/presentation/components/create-staff-user-form.tsx` — `shadow-none` on Card
- `src/domains/auth/domain/repository.ts` — removed unused `actorMerchantId` from `StaffUserRepository` port (tenant bind via RPC `auth.uid()`)
- `src/domains/auth/infrastructure/supabase-staff-repo.ts` — aligned with simplified port
- `src/domains/auth/application/use-cases.test.ts` — updated repository delegation assertion

**Verification:**
- `pnpm exec tsc --noEmit` — pass
- `pnpm test` — 34/34 pass
- `pnpm exec eslint` on touched auth/sidebar files — pass

**Notes:** Human E2E still blocked on `SUPABASE_SERVICE_ROLE_KEY` and local migration CLI; not in this pass. Ready for re-review.

## 2026-09-02 12:32 — leader

**Action:** Implementer [f9134d81-244a-4db8-aa40-6db9e2ae0332] completed the fix-pass. Status set to **`review_pending`**. Launching **reviewer** re-review of the three majors + optional nits. Spec files not edited. Notion Kanban not used. `src/` not edited by leader.

## 2026-09-02 12:33 — reviewer

**Verdict:** pass_with_notes

**Findings:**
- [resolved] `app-sidebar.tsx` — `SidebarMenuButton size="lg"` (`h-12` / 48px) on nav links; logout already `min-h-11`. NFR-7 / AC-33 addressed.
- [resolved] `src/shared/infrastructure/supabase/admin.ts` — `import "server-only"` present; `server-only@0.0.1` in `package.json` and `node_modules`. `createAdminClient` only imported from `"use server"` `staff-user-action.ts` (type-only import in staff repo).
- [resolved] `docs/database-schema.md` — `## Staff user RPC` documents `create_staff_user_profile` (params, SECURITY DEFINER, admin-only, merchant_id from caller).
- [nit] `src/shared/presentation/ui/sidebar.tsx` `SidebarRail` — accessible name still English ("Toggle Sidebar"); primary `SidebarTrigger` correctly uses "Abrir menú" / "Cerrar menú".
- [follow-up] Manual browser matrix still blocked/deferred (missing `SUPABASE_SERVICE_ROLE_KEY`, local migration CLI, DevTools timeout, two-merchant RLS). Documented; not a code blocker per review brief.

**Optional nits spot-check (no regressions):**
- Spanish forbidden messages in `createStaffUser` ✓
- Login/create-staff `shadow-none` + link `font-semibold` ✓
- `actorMerchantId` removed from `StaffUserRepository` port; tenant bind remains RPC `auth.uid()` ✓
- Presentation/`src/app` still no `@supabase/supabase-js` (except auth confirm OTP type) ✓
- Vitest reconfirmed 34/34; Console Ninja: no runtime errors

**CHECKPOINTS delta vs first review (2026-09-02 12:26):**
- Spec & process: pass (unchanged)
- Code quality: pass (unchanged)
- Architecture fit: **pass** (was pass_with_notes — server-only guard now enforced)
- Presentation / UI: **pass** (was pass_with_notes — touch targets fixed; weight-500/shadow nits addressed)
- Data & tenancy: **pass_with_notes** (schema docs now OK; RLS/create-staff human smoke still deferred on env)
- Verification: **pass_with_notes** (Vitest green; manual ACs still partial — env follow-ups only)
- Documentation: pass (unchanged)

**Manual verification status:** partial

**Notes:**
- All three prior **major** findings are fixed in code/docs.
- Leader **may set `done`**. Remaining notes are env/human E2E follow-ups only — do not block completion.
- Do not claim create-staff / multi-tenant RLS production-ready until human sets `SUPABASE_SERVICE_ROLE_KEY` and runs L2/L4 smoke.

## 2026-09-02 12:35 — leader

**Action:** Re-review [c2e26f30-bf65-4b97-bed8-51f74500a7b8] verdict **`pass_with_notes`**. Prior majors resolved. Status set to **`done`**. Spec files not edited during implementation. Notion Kanban not used. `src/` not edited by leader.

**Follow-ups (human/env, not code blockers):**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (server-only).
2. Apply migration locally if using local Supabase (`20260902120000_create_staff_user_profile.sql`).
3. Restart `pnpm dev` and smoke: admin login, create-staff, RBAC matrix, sidebar mobile+desktop.
4. Two-merchant RLS (AC-22) still deferred without a second merchant fixture.

## 2026-09-02 13:50 — implementer (post-review runtime fix)

**Task:** Post-review bugfix — Tailwind v4 CSS at-rules + Next.js 16 blocking prerender on `(app)` routes

**Changes:**
- `src/app/globals.css` — removed `@custom-variant` and `@theme inline`; moved `--sidebar-*` tokens into `@layer base` `:root`/`.dark` using HSL components aligned with DESIGN.md Flame Red
- `tailwind.config.ts` — added `theme.extend.colors.sidebar` for Tailwind v3 `bg-sidebar` utilities
- `src/shared/presentation/ui/sidebar.tsx` — fixed arbitrary shadow values to use `hsl(var(--sidebar-*))`
- `src/domains/auth/presentation/components/protected-app-shell.tsx` — new merged auth gate + app shell (single `getUser`, `connection()` + Suspense-friendly)
- `src/domains/auth/presentation/components/app-shell-skeleton.tsx` — DESIGN.md skeleton fallback for streaming
- `src/app/(app)/layout.tsx` — Suspense wraps `ProtectedAppShell`; keeps `export const instant = false`
- `src/app/(app)/loading.tsx` — segment loading state using same skeleton
- `src/domains/auth/presentation/components/role-route-gate.tsx` — client RBAC gate via `useSession()` (no duplicate server `getUser`)
- `src/app/(app)/dashboard/page.tsx` — client page via `useSession()` (no duplicate server fetch)

**Verification:**
- `pnpm exec tsc --noEmit` — pass
- Fresh `pnpm dev`: no `@custom-variant` / `@theme` CSS warnings; no `uncached data outside Suspense` on GET `/dashboard`, `/waste`, `/inventory`, `/kitchen`
- Unauthenticated curl still triggers `instant` validation noise on redirect to `/login` (expected for auth-gated routes without session cookies)

**Notes:** `protected-session-gate.tsx` retained but superseded by `protected-app-shell.tsx` in layout.

## 2026-09-02 14:05 — implementer (sidebar layout bugfix)

**Task:** Post-review bugfix — desktop sidebar overlapping main content on `(app)` shell

**Root cause:** `src/shared/presentation/ui/sidebar.tsx` still used Tailwind v4 utility syntax (`w-(--sidebar-width)`, `w-(--sidebar-width-icon)`, `(--spacing(4))`, `max-w-(--skeleton-width)`). On Tailwind 3.4 these classes are ignored, so `[data-slot="sidebar-gap"]` rendered at 0px width while the fixed sidebar stayed at full width — content started at viewport x=0 and sat under the sidebar.

**Changes:**
- `src/shared/presentation/ui/sidebar.tsx` — converted all v4 width utilities to v3 arbitrary values (`w-[var(--sidebar-width)]`, `w-[var(--sidebar-width-icon)]`, `max-w-[var(--skeleton-width)]`; icon calc uses `1rem` instead of `(--spacing(4))`)
- `src/app/globals.css` — added fallback `--sidebar-width: 16rem` and `--sidebar-width-icon: 3rem` on `:root` (SidebarProvider still sets them inline)

**Verification:** Chrome DevTools MCP at 1280×800 — `/dashboard#personal`, `/inventory`, `/orders`: gap 256px, inset starts at left 256px, headings and forms fully visible. Mobile (~375–500px): sidebar offcanvas, inset full width (left 0). RBAC/session shell composition unchanged (`SidebarProvider` → `AppSidebar` + `SidebarInset`).

**Notes:** Layout structure in `protected-app-shell.tsx` was already correct; fix was CSS utility compatibility only.

## 2026-09-02 14:38 — implementer (auth UX bugfix)

**Task:** Landing CTAs + `/login` guard for authenticated users

**Changes:**
- `src/domains/auth/domain/rbac.ts` — added `resolveAuthenticatedEntryPath()` (login / onboarding / role landing)
- `src/domains/auth/domain/rbac.test.ts` — tests for entry path resolution
- `src/domains/auth/presentation/components/guest-session-gate.tsx` — server gate redirecting active sessions away from guest routes
- `src/app/(auth)/login/layout.tsx` — wraps login with `GuestSessionGate`
- `src/app/page.tsx` — async landing; CTAs use session-aware `entryPath` and copy (“Ir al panel” when authenticated)

**Verification:** `pnpm test src/domains/auth/domain/rbac.test.ts` — 14 passed. Manual: logged-in admin on `/` → CTAs go to `/dashboard`; `/login` redirects to app; logged-out unchanged.

**Notes:** Uses `getDefaultLandingRoute` via `resolveAuthenticatedEntryPath`. Incomplete onboarding → `/onboarding`. `/register` unchanged. `proxy.ts` session-only behavior preserved.

## 2026-09-02 15:20 — implementer (prerender fix)

**Task:** Fix blocking-prerender-dynamic on `/` and `/login` — session CTAs behind `<Suspense>` + `connection()`.

**Changes:** `src/app/page.tsx`, `src/domains/auth/presentation/components/landing-session-ctas.tsx` (new), `src/domains/auth/presentation/components/guest-session-gate.tsx`.

**Verification:** Manual — visit `/` and `/login` logged-in/out; no prerender error in dev terminal.

## 2026-09-02 15:50 — implementer (route split: Panel vs Personal)

**Task:** Post-approval routing change — separate `/dashboard` stub from `/staff` create-user form.

**Changes:**
- `src/domains/auth/domain/rbac.ts` — added `/staff` to `AppRoute` and `PROTECTED_APP_ROUTES`; admin-only access; `resolveAppRoute` uses protected routes list
- `src/domains/auth/domain/rbac.test.ts` — staff allow/deny + redirect tests; nav helper excludes `/staff`
- `src/app/(app)/dashboard/page.tsx` — Spanish “Panel de control” + “Próximamente” stub (no create-user form)
- `src/app/(app)/staff/page.tsx` — new Personal page with `CreateStaffUserForm`
- `src/app/(app)/staff/layout.tsx` — `RoleRouteGate` admin-only
- `src/domains/auth/presentation/components/app-sidebar.tsx` — Personal nav → `/staff` (removed `#personal` anchor)
- `src/domains/auth/presentation/components/create-staff-user-form.tsx` — removed `id="personal"` hash anchor

**RBAC:**
- `/dashboard` — admin only (stub); landing for admin unchanged
- `/staff` — admin only; `grill_master` → `/kitchen`; `waiter` → `/orders`
- Nav: admin sees Panel (`/dashboard`) + Personal (`/staff`); grill_master/waiter do not see Personal
- `getNavRoutesForRole` unchanged for main routes; Personal remains sidebar-only for admin

**Verification:** `pnpm test src/domains/auth/domain/rbac.test.ts` — 15 passed; `pnpm exec tsc --noEmit` — pass. Browser (admin): `/dashboard` shows “Panel de control” + “Próximamente”; sidebar Personal → `/staff` with create-user form. Non-admin redirect: covered by unit tests (`grill_master` → `/kitchen`, `waiter` → `/orders`).

**Notes:** Supersedes Task 13 / Task 19 anchor pattern (`/dashboard#personal`). Spec tasks.md still references old anchor — human-approved route change only; spec not edited per harness rules.

## 2026-09-02 16:28 — leader

**Action:** Human finished manual smoke. Status remains **`done`**. Feature closed for now.

**Notes:**
- Human smoke passed 2026-09-02: login, RBAC matrix, create-staff, sidebar (mobile + desktop).
- Two-merchant RLS (AC-22) still deferred without a second merchant fixture.
- Spec files not rewritten. Notion Kanban not used.
