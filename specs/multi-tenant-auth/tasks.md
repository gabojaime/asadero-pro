# Tasks — Multi-Tenant Authentication & Session Safeguards

Ordered vertical slices. Each task fits one implementer session. Tags: `vitest` | `manual`.

**Prerequisite:** [merchant-onboarding](../merchant-onboarding/) merged or present on branch (migration applied, onboarding gates working).

---

## Phase 1 — Domain foundation

### Task 1: RBAC domain module + tests

**Description:** Add pure RBAC functions in `src/domains/auth/domain/rbac.ts`: `getDefaultLandingRoute`, `isRouteAllowed`, `resolveRoleRedirect`, `APP_NAV_ROUTES`, and `getNavRoutesForRole` using the **approved** matrix in [design.md](./design.md) and [requirements.md](./requirements.md#fr-8--role-based-route-guarding-rbac). Cover prefix paths (`/orders/uuid`). `getNavRoutesForRole` is the nav contract for sidebar (FR-17) — presentation must not duplicate the matrix.

**Acceptance criteria:**
- [ ] All three roles tested for each MVP route prefix
- [ ] `grill_master` allowed on `/inventory`, `/orders`, `/waste`, `/kitchen`; denied only `/dashboard` → `/kitchen`
- [ ] `waiter` allowed only on `/orders`; denied elsewhere → `/orders`
- [ ] Denied routes return correct redirect target
- [ ] `getNavRoutesForRole`: admin gets all five routes; grill_master excludes `/dashboard`; waiter returns `['/orders']` only
- [ ] No React/Supabase imports in domain

**Verification:** `vitest` — `pnpm test src/domains/auth/domain/rbac.test.ts`

**Dependencies:** None

**Files:** `domain/rbac.ts`, `domain/rbac.test.ts`

---

### Task 2: Login + create-staff validation + tests

**Description:** Replace placeholder `validations.ts` with Zod `signInCredentialsSchema` and `createStaffUserInputSchema` plus safe-parse helpers.

**Acceptance criteria:**
- [ ] Sign-in: rejects empty email/password; trims email
- [ ] Create-staff: validates email, password (min 6, max 72), full name, role enum
- [ ] Returns structured field errors

**Verification:** `vitest` — `pnpm test src/domains/auth/domain/validations.test.ts`

**Dependencies:** None

**Files:** `domain/validations.ts`, `domain/validations.test.ts`

---

## Phase 2 — Auth sign-in hexagonal slice

### Task 3: AuthRepository port + signIn use case

**Description:** Extend `repository.ts` with `AuthRepository`. Add `signIn` and optional `signOut` to `application/use-cases.ts`. Map domain auth errors.

**Acceptance criteria:**
- [ ] Use case validates before calling repo
- [ ] Application layer has no Supabase imports

**Verification:** `vitest` — extend `application/use-cases.test.ts` with signIn mock repo test

**Dependencies:** Task 2

**Files:** `domain/repository.ts`, `application/use-cases.ts`, `application/use-cases.test.ts`

---

### Task 4: Supabase auth repo + useSignIn mutation adapter

**Description:** Implement `createAuthRepository` in infrastructure. Add `useSignIn()` mutation in `query-adapters.ts`. On success, invalidate `sessionProfileQueryKey`.

**Acceptance criteria:**
- [ ] Infrastructure owns Supabase client creation
- [ ] Mutation callable from presentation

**Verification:** `manual` — wire temporarily; full UI in Task 5

**Dependencies:** Task 3

**Files:** `infrastructure/supabase-auth-repo.ts`, `infrastructure/query-adapters.ts`

---

### Task 5: Refactor LoginForm + DESIGN.md styling

**Description:** Update `login-form.tsx` to use `useSignIn()` (no direct `createClient`). Remove `shadow-xl`. Apply DESIGN.md flat card tokens. Post-success navigation uses `getDefaultLandingRoute` when profile available, else push `/dashboard` for server RBAC hop.

**Acceptance criteria:**
- [ ] No `@supabase/supabase-js` import in login form
- [ ] Card has hairline border, no heavy shadow
- [ ] AC-1, AC-2, AC-3 satisfied

**Verification:** `manual` — sign in as admin in browser

**Dependencies:** Task 4

**Files:** `presentation/components/login-form.tsx`, optionally `(auth)/login/page.tsx`

---

## Checkpoint A

- [ ] `pnpm test` passes for auth domain/application tests
- [ ] Admin login works end-to-end
- [ ] Grep: no Supabase import in login presentation

---

## Phase 3 — Session context

### Task 6: Fix useSessionProfile query key + SessionProvider

**Description:** Align `useSessionProfile` with `['session-profile', userId]`. Create `SessionProvider` exposing `merchantId`, `role`, `userId`, loading/error. Mount in `(app)/layout.tsx` inside server gates.

**Acceptance criteria:**
- [ ] Query key matches conventions
- [ ] Client children can read `merchantId` via hook
- [ ] Provider only mounts for onboarded users
- [ ] AC-14 satisfied

**Verification:** `manual` — React DevTools or temporary debug consumer

**Dependencies:** Task 5 (session available after login)

**Files:** `infrastructure/query-adapters.ts`, `presentation/providers/session-provider.tsx`, `(app)/layout.tsx`

---

## Phase 4 — RBAC gates + kitchen stub

### Task 7: RoleRouteGate + per-route layouts

**Description:** Create server `RoleRouteGate` using `getServerSessionProfile` + `resolveRoleRedirect`. Add nested layouts per [design.md](./design.md):

| Layout | Allowed roles |
|--------|---------------|
| `dashboard/layout.tsx` | `admin` |
| `inventory/layout.tsx` | `admin`, `grill_master` |
| `orders/layout.tsx` | `admin`, `grill_master`, `waiter` |
| `waste/layout.tsx` | `admin`, `grill_master` |
| `kitchen/layout.tsx` | `admin`, `grill_master` |

**Acceptance criteria:**
- [ ] Admin reaches all five routes (AC-6)
- [ ] `grill_master` denied **only** `/dashboard` → `/kitchen` (AC-7)
- [ ] `grill_master` can access `/inventory`, `/orders`, `/waste`, `/kitchen` (AC-9)
- [ ] `waiter` denied `/dashboard` → `/orders` (AC-8)
- [ ] `waiter` can access `/orders` only; other routes → `/orders` (AC-11)
- [ ] RBAC runs after `ProtectedSessionGate`

**Verification:** `manual` — requires test users via admin UI (Task 14)

**Dependencies:** Task 1, Task 6

**Files:** `presentation/components/role-route-gate.tsx`, `(app)/*/layout.tsx`, `(app)/layout.tsx`

---

### Task 8: Kitchen stub page

**Description:** Add `src/app/(app)/kitchen/page.tsx` minimal Spanish placeholder. Protected by full gate chain.

**Acceptance criteria:**
- [ ] `/kitchen` loads for admin and grill_master (AC-13)
- [ ] Waiter redirected to `/orders`
- [ ] No kitchen business logic or order queries

**Verification:** `manual`

**Dependencies:** Task 7

**Files:** `(app)/kitchen/page.tsx`

---

### Task 9: Role-aware default landing after login + onboarding

**Description:** After sign-in, navigate to `getDefaultLandingRoute(role)` when session profile is readable; document one-hop fallback via `/dashboard`. **Update `OnboardingSessionGate`** to redirect onboarded users to `getDefaultLandingRoute(role)` instead of hardcoded `/dashboard` (OQ-7 closed).

**Acceptance criteria:**
- [ ] admin → `/dashboard` (AC-6)
- [ ] grill_master → `/kitchen` (AC-10)
- [ ] waiter → `/orders` (AC-12)
- [ ] Post-onboarding redirect uses domain helper, not hardcoded `/dashboard`

**Verification:** `manual`

**Dependencies:** Task 5, Task 7, Task 8

**Files:** `login-form.tsx`, `onboarding-session-gate.tsx`

---

## Phase 5 — Admin create-user vertical slice

### Task 10: StaffUserRepository port + createStaffUser use case + tests

**Description:** Add `StaffUserRepository` to `repository.ts`. Add `CreateStaffUserInput/Result` entities. Implement `createStaffUser(input, actorProfile, repo)` — rejects non-admin, null `merchantId`; never accepts `merchantId` from input.

**Acceptance criteria:**
- [ ] Use case rejects `grill_master` and `waiter` actors
- [ ] Use case passes `actorProfile.merchantId` to repo, not client input
- [ ] Application layer has no Supabase imports

**Verification:** `vitest` — extend `application/use-cases.test.ts`

**Dependencies:** Task 2

**Files:** `domain/entities.ts`, `domain/repository.ts`, `application/use-cases.ts`, `application/use-cases.test.ts`

---

### Task 11: Focused migration + admin client + staff infra repo

**Description:**

1. Create `src/shared/infrastructure/supabase/admin.ts` — server-only `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_*`).
2. Add migration `supabase/migrations/<timestamp>_create_staff_user_profile.sql` per [design.md](./design.md) — `SECURITY DEFINER`, admin check, tenant-bound `merchant_id`, revoke/grant pattern.
3. Implement `createStaffUserRepository` in `infrastructure/supabase-staff-repo.ts`: `auth.admin.createUser` → RPC → compensating `deleteUser` on RPC failure.
4. Regenerate Supabase types.

**Acceptance criteria:**
- [ ] Admin client not importable from `'use client'` modules (code review)
- [ ] RPC derives `merchant_id` from caller admin row — not from parameters
- [ ] Migration applies locally; run advisors post-apply

**Verification:** `manual` — apply migration locally; smoke RPC via admin session

**Dependencies:** Task 10

**Files:** `shared/infrastructure/supabase/admin.ts`, `infrastructure/supabase-staff-repo.ts`, `supabase/migrations/<timestamp>_create_staff_user_profile.sql`, `shared/infrastructure/database/supabase.types.ts`

---

### Task 12: Server action + useCreateStaffUser adapter

**Description:** Add `createStaffUserAction` server action wrapper loading actor profile via `getServerSessionProfile`. Add `useCreateStaffUser()` mutation in `query-adapters.ts` calling the action.

**Acceptance criteria:**
- [ ] No service role in client bundle
- [ ] Action rejects non-admin before use case
- [ ] AC-20 satisfied (grep presentation/app for Supabase on create path)

**Verification:** `manual` — wire to form in Task 13

**Dependencies:** Task 11

**Files:** `infrastructure/staff-user-action.ts`, `infrastructure/query-adapters.ts`

---

### Task 13: Dashboard create-user UI panel

**Description:** Add `create-staff-user-form.tsx` on `/dashboard` (admin-only section) with `id="personal"` for sidebar anchor `/dashboard#personal`. Fields: email, password, full name, role select with `ROLE_LABELS` (Administrador, Parrillero, Mesero). DESIGN.md flat card. Server gate hides panel for non-admin.

**Acceptance criteria:**
- [ ] AC-16: admin creates staff from dashboard
- [ ] AC-17: created user has admin's `merchant_id`
- [ ] AC-18: new staff can sign in and lands on role default
- [ ] AC-19: non-admin cannot see form or invoke use case
- [ ] AC-20: no `@supabase/supabase-js` in presentation/app create path

**Verification:** `manual`

**Dependencies:** Task 12, Task 7 (dashboard admin gate)

**Files:** `presentation/components/create-staff-user-form.tsx`, `domain/role-labels.ts`, `(app)/dashboard/page.tsx`

---

## Phase 6 — Verification & hardening

### Task 14: Manual RBAC + create-user regression matrix

**Description:** Document manual test matrix in `progress/multi-tenant-auth.md`. Verify onboarding redirects still work. Create `grill_master` and `waiter` test users via **admin dashboard UI** (not SQL/Studio as product path).

**Acceptance criteria:**
- [ ] AC-4, AC-5: unauthenticated and non-onboarded redirects unchanged
- [ ] AC-6 through AC-13: full RBAC matrix exercised
- [ ] AC-16 through AC-19: create-user flow exercised
- [ ] No redirect loops

**Verification:** `manual` — [docs/verification.md](../../docs/verification.md) L2–L3

**Dependencies:** Tasks 7–9, 13

---

### Task 15: Proxy + RLS smoke review

**Description:** Confirm `proxy.ts` / `updateSession` has no `public.users` query (AC-15). Run two-merchant RLS smoke if feasible (AC-22).

**Acceptance criteria:**
- [ ] Code review: proxy session-only
- [ ] RLS smoke documented pass/deferred with reason

**Verification:** `manual` L4

**Dependencies:** Task 14

**Files:** Review only — `proxy.ts`, `shared/infrastructure/supabase/proxy.ts`

---

### Task 16: CLI quality gate

**Description:** Run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`. Fix any regressions.

**Acceptance criteria:**
- [ ] AC-21: domain RBAC, login validation, create-user validation tests pass
- [ ] AC-23: tsc and lint pass

**Verification:** `vitest` + CLI

**Dependencies:** All above

---

## Phase 7 — App shell / Sidebar (mobile-first)

**Prerequisite:** Tasks 6–7 complete (`SessionProvider`, RBAC gates, role test users from Task 14).

### Task 17: Install shadcn Sidebar primitive

**Description:** Run `pnpm dlx shadcn@latest add sidebar` targeting `src/shared/presentation/ui/` per `components.json` (`ui` → `@/shared/presentation/ui`). Accept any peer deps the CLI adds (Sheet, Separator, Tooltip, etc.) into the same folder. Do not install to `@/components/ui`.

**Acceptance criteria:**
- [ ] `sidebar.tsx` exists under `src/shared/presentation/ui/`
- [ ] Imports resolve via `@/shared/presentation/ui/sidebar`
- [ ] `pnpm exec tsc --noEmit` passes after install

**Verification:** `manual` — import smoke in layout

**Dependencies:** Task 16 (clean tree)

**Files:** `src/shared/presentation/ui/sidebar.tsx` (+ CLI peers)

---

### Task 18: `(app)` layout shell — strip starter chrome

**Description:** Refactor `src/app/(app)/layout.tsx`: keep `ProtectedSessionGate` → `SessionProvider`; wrap with `SidebarProvider`, mount `AppSidebar` + `SidebarInset` + `AppShellHeader` with `SidebarTrigger`. Remove DeployButton, generic Next.js nav, AuthButton top nav, Supabase footer, and competing starter chrome. `(auth)/*` layouts unchanged (no sidebar).

**Acceptance criteria:**
- [ ] AC-24: sidebar shell renders under `(app)`
- [ ] AC-25: auth routes have no sidebar
- [ ] Starter chrome removed from `(app)/layout.tsx`

**Verification:** `manual`

**Dependencies:** Task 17, Task 6

**Files:** `(app)/layout.tsx`, `app-shell-header.tsx` (stub ok until Task 19)

---

### Task 19: Role-filtered `AppSidebar` + merchant header + footer

**Description:** Create `app-sidebar.tsx` using `getNavRoutesForRole(role)` from domain RBAC (Task 1). Map routes to Spanish labels per [design.md](./design.md). Admin-only “Personal” → `/dashboard#personal`. `SidebarHeader` shows `merchantName` (extend session profile or merchant query — FR-20). `SidebarFooter`: `fullName`, `ROLE_LABELS[role]`, existing logout (FR-12). Active route via `isActive` on `SidebarMenuButton`.

**Acceptance criteria:**
- [ ] AC-26, AC-27, AC-28, AC-29, AC-30 satisfied
- [ ] AC-36, AC-37, AC-38 satisfied
- [ ] No duplicated RBAC matrix in presentation (grep/review)

**Verification:** `manual` — all three roles

**Dependencies:** Task 18, Task 1, Task 13 (`id="personal"` anchor)

**Files:** `app-sidebar.tsx`, session profile/repo if extended for `merchantName`

---

### Task 20: Mobile offcanvas behavior

**Description:** Configure Sidebar `collapsible="offcanvas"` on mobile (shadcn responsive pattern). `AppShellHeader` with hamburger `SidebarTrigger` (≥44px). Close overlay on nav link click (`setOpenMobile(false)`). `min-h-svh` shell; safe-area padding on top bar. Full-width `SidebarInset` content on mobile.

**Acceptance criteria:**
- [ ] AC-31, AC-32, AC-33, AC-34 satisfied
- [ ] No hover-only nav actions

**Verification:** `manual` — Chrome DevTools ~375px + one real device if available

**Dependencies:** Task 19

**Files:** `app-sidebar.tsx`, `app-shell-header.tsx`, `(app)/layout.tsx`

---

### Task 21: DESIGN.md sidebar token theming

**Description:** Map `--sidebar-*` variables in `src/app/globals.css` to DESIGN.md tokens (Flame Red accent, flat surfaces, hairline borders). No default shadcn gray demo palette; no `shadow-lg`/`shadow-xl` on sidebar.

**Acceptance criteria:**
- [ ] AC-35 satisfied
- [ ] Active nav item uses Flame Red accent
- [ ] Font weights 300/400/600/700 only in sidebar UI

**Verification:** `manual` — light + dark mode spot check

**Dependencies:** Task 17

**Files:** `src/app/globals.css`

---

### Task 22: App shell manual smoke — all roles, mobile + desktop

**Description:** Exercise sidebar + nav for admin, grill_master, waiter at ~375px and desktop. Confirm overlay close, no h-scroll, sign-out works, Personal link reaches create-user panel.

**Acceptance criteria:**
- [ ] AC-24 through AC-38 pass or documented deferral
- [ ] AC-39 if `getNavRoutesForRole` tests added in Task 1
- [ ] No redirect loops with sidebar navigation

**Verification:** `manual` — [docs/verification.md](../../docs/verification.md) L2–L3

**Dependencies:** Tasks 17–21

---

## Checkpoint B (review_pending)

- [ ] All acceptance criteria in [requirements.md](./requirements.md) pass or deferred with reason (AC-1 through AC-39)
- [ ] All OQ-1–OQ-10 closed (no blocking open questions)
- [ ] Focused migration `create_staff_user_profile` applied and documented
- [ ] No `@supabase/supabase-js` in presentation/`src/app/` for login or create-user paths
- [ ] `(app)` shell uses shadcn Sidebar; starter chrome removed; role-filtered nav from domain RBAC
- [ ] `progress/multi-tenant-auth.md` verification table complete

---

## Out of scope reminders (do not expand tasks)

- Merchant self-signup, email invitation / magic-link staff onboarding
- Register restyle, kitchen MVP, full RLS mutation policy rewrite
- Staff listing, edit, deactivate, or role change UI
- E2E suite (Cypress/Playwright)
- Separate `/staff` protected route (admin create-user stays on `/dashboard#personal`)

**Emergency dev fallback only (not AC):** SQL/Studio user insert documented in progress journal.
