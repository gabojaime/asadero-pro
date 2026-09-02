# Multi-Tenant Authentication & Session Safeguards

Secure sign-in, session handling, tenant context, role-based route guards, and **admin staff provisioning** for the BBQ multi-tenant MVP. Builds on [merchant-onboarding](../merchant-onboarding/) — this feature is **login + session + RBAC + tenant context + admin create-user**, not merchant self-signup or merchant creation.

Product source: [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §2 (lines 27–42).

## Problem

After merchant onboarding, staff must sign in and operate inside a **tenant-scoped session** with **role-appropriate navigation**. Admins must be able to **create staff users** for their asadero without SQL or Studio. Today:

- Login works via Supabase Auth but the form imports `createClient` directly in presentation (hexagonal debt).
- Session profile read path exists (`SessionProfile`, `getServerSessionProfile`, onboarding gate) but there is no **client tenant context** for query keys, no **RBAC** beyond onboarding completeness, and no **role-filtered app shell** for `(app)` routes.
- `(app)` routes (`/dashboard`, `/inventory`, `/orders`, `/waste`) are placeholders with no role guards.
- `/kitchen` does not exist yet, but product requires `grill_master` users to land on a kitchen queue route.
- No admin UI to provision `grill_master` / `waiter` staff for the current merchant.
- RLS provides tenant isolation at the database; **route-level RBAC** is not implemented in the app layer.

Without this feature, any onboarded user can browse all operational pages regardless of role, and admins cannot onboard staff through the product.

## Goals

1. **Sign-in** through hexagonal auth ports and query adapters — presentation/`src/app/` must not import `@supabase/supabase-js`.
2. **Session + tenant context**: server profile for security gates; client context/provider for `merchantId`, `role`, and TanStack Query keys.
3. **RBAC route guards** in `(app)` based on canonical DB roles: `admin`, `grill_master`, `waiter` — **approved matrix** (see below).
4. **Admin staff provisioning** from the dashboard: create user with email, password, full name, and role; bind to **current admin’s merchant** only.
5. **Preserve onboarding locks** from [merchant-onboarding](../merchant-onboarding/): incomplete users → `/onboarding`; proxy stays **session-only** (no `public.users` query in proxy).
6. **Login UI** aligned with [DESIGN.md](../../DESIGN.md) (flat card, Flame Red accent, no heavy shadows).
7. **Pure domain RBAC matrix** and create-user validation covered by Vitest; UI/RLS by manual verification.
8. **Authenticated `(app)` shell** with shadcn/ui Sidebar (Base UI): mobile-first offcanvas navigation, role-filtered nav derived from domain RBAC (no duplicate matrix in presentation), merchant branding in header, user/role/sign-out in footer — `(auth)` routes remain sidebar-free.

## Approved RBAC matrix

| Route | `admin` | `grill_master` | `waiter` |
|-------|---------|----------------|----------|
| `/dashboard` | yes | → `/kitchen` | → `/orders` |
| `/inventory` | yes | yes | → `/orders` |
| `/orders` | yes | yes | yes |
| `/waste` | yes | yes | → `/orders` |
| `/kitchen` | yes | yes | → `/orders` |

Default landings: `admin` → `/dashboard`, `grill_master` → `/kitchen`, `waiter` → `/orders`.

## Dependency: merchant-onboarding

| Onboarding lock | How this feature respects it |
|-----------------|------------------------------|
| Auth user without `public.users` → `/onboarding` | Reuse `ProtectedSessionGate` / `getServerSessionProfile`; RBAC runs **after** onboarding check |
| `(app)` blocked until onboarded | Unchanged; RBAC is additive |
| `/onboarding` under `(auth)`, not `(app)` | Unchanged |
| Proxy: session cookie only; **no** `public.users` in proxy | **Locked** — profile/role loaded in Server Components / layouts, not in `proxy.ts` |
| Bootstrap via `SECURITY DEFINER` RPC; no ad-hoc service-role from client paths | Staff provisioning uses **server-only** admin Auth API + focused RPC for `public.users` insert (see [design.md](./design.md)) |
| No signup / merchant creation here | Merchant self-serve register remains out of scope |
| Login/register restyle deferred in onboarding | **This feature may restyle login**; register stays as-is unless minimal consistency tweak is needed |

Status: `merchant-onboarding` is `review_pending` — implement this feature only after onboarding is merged or concurrently without contradicting locked decisions.

## Roles affected

Canonical values from PostgreSQL enum `user_role` (migration `20260825204800_initial_schema_and_onboarding.sql`):

| DB value | UI label (Spanish) | This feature |
|----------|-------------------|--------------|
| `admin` | Administrador | Full access to all `(app)` routes; only role that can create staff |
| `grill_master` | **Parrillero** | Default landing `/kitchen`; blocked from `/dashboard` only; may access `/inventory`, `/orders`, `/waste`, `/kitchen` |
| `waiter` | Mesero | Default landing `/orders`; may access `/orders` only |

Code, DB, and TypeScript use snake_case enum values (`grill_master`). UI shows localized labels via a display map constant — **not** alternate DB values.

## What already exists vs what will be added

### Already exists (reuse / extend)

| Asset | Location | Notes |
|-------|----------|-------|
| Root proxy (Next.js 16 convention) | `proxy.ts` → `src/shared/infrastructure/supabase/proxy.ts` | Session refresh via `getClaims()`; unauthenticated redirect to `/login` |
| Login page shell | `src/app/(auth)/login/page.tsx` | Split layout partially aligned with brand |
| Login form | `src/domains/auth/presentation/components/login-form.tsx` | **Direct Supabase import** — must migrate to adapters |
| Session profile entity + port | `src/domains/auth/domain/entities.ts`, `repository.ts` | `UserRole`, `SessionProfile` |
| Session profile use case + repo | `application/use-cases.ts`, `infrastructure/supabase-repo.ts` | Onboarding-aware profile read |
| Server profile helper | `infrastructure/session-profile-server.ts` | Used by gates |
| Onboarding / protected gates | `protected-session-gate.tsx`, `onboarding-session-gate.tsx` | Session + `isOnboarded` checks |
| Client profile query | `infrastructure/query-adapters.ts` | `useSessionProfile()` — query key needs `userId` alignment |
| Password recovery / confirm | `src/app/auth/*` | Keep as-is |
| Register | `src/app/(auth)/register/page.tsx` | Out of scope for restyle |
| Schema + RLS + onboarding RPC | `supabase/migrations/20260825204800_initial_schema_and_onboarding.sql` | Extend with focused staff RPC (see design) |
| `(app)` placeholder pages | `dashboard`, `inventory`, `orders`, `waste` | Guard targets; not full feature implementation |

### Will be added

| Asset | Purpose |
|-------|---------|
| Auth sign-in port + use case + infra repo | Hexagonal login (`signInWithPassword`) |
| Login mutation query adapter | Client form calls adapter, not Supabase |
| Domain RBAC module | Route allow matrix, default landing, redirect resolver (Vitest) |
| `RoleRouteGate` (Server Component) | RBAC after onboarding gate in `(app)` |
| `SessionProvider` / tenant context | Client `merchantId` + `role` for hooks and query keys |
| `/kitchen` stub page | Satisfies `grill_master` redirect contract until kitchen MVP |
| Login UI refresh | DESIGN.md flat card; remove `shadow-xl` |
| Role-aware post-login redirect | Domain-driven default route per role |
| **Admin create-user vertical slice** | Domain validation, port, use case, server-only infra, dashboard UI panel |
| Focused migration | `create_staff_user_profile` RPC + admin Auth user server path |
| Manual RLS smoke checklist | Tenant isolation verification |
| shadcn Sidebar primitive | Installed to `src/shared/presentation/ui/` via CLI (`components.json` alias `@/shared/presentation/ui`) |
| `(app)` layout shell | `SidebarProvider` + `AppSidebar` + `SidebarInset`; removes starter chrome (DeployButton, generic nav, Supabase footer) |
| Role-filtered sidebar nav | Links derived from domain `isRouteAllowed` / `getNavRoutesForRole`; hidden routes not teased |
| Sidebar DESIGN.md theming | Map `--sidebar-*` CSS variables to AMS tokens in `globals.css` |
| Merchant name in sidebar header | `merchants.name` via session profile join or lightweight merchant query |

## In scope

- Login hexagonal extraction and DESIGN.md-aligned login UI
- Session/tenant context (server + client)
- RBAC route guards for `(app)/*` routes per approved matrix
- `/kitchen` **stub** (guard/redirect contract only)
- Role-based default landing after login and post-onboarding redirect via `getDefaultLandingRoute(role)`
- **Admin dashboard UI to create staff users** (email + password + full name + role) for current merchant
- Vitest for pure RBAC, login validation, create-user validation, and nav-route helper (if added)
- **Mobile-first authenticated app shell** with shadcn Sidebar: offcanvas on mobile, icon collapse on desktop, RBAC-filtered nav, DESIGN.md token mapping
- Manual verification of redirects, session, RLS smoke, create-user flow, and layout smoke per role (~375px + desktop)

## Out of scope

- Merchant self-serve signup, merchant creation, public registration flows (merchant-onboarding owns bootstrap)
- Email invitation / magic-link staff onboarding (admin sets initial password; staff may use forgot-password later)
- Full kitchen queue MVP (feature 4) — stub only
- Financial dashboard metrics, inventory CRUD, order flow business logic
- Role-specific **RLS mutation policy** rewrite (separate spec unless create-user migration requires minimal INSERT policy — see design)
- Email confirmation gates in app code
- Restyling `/register` (unless trivial link/copy consistency)
- Cypress/Playwright E2E
- Staff listing, edit, deactivate, or role change UI (create-only in this feature)

## Closed decisions (formerly open questions)

All OQ-1 through OQ-10 are **closed**. See [requirements.md](./requirements.md#closed-decisions).

Summary:

| ID | Decision |
|----|----------|
| OQ-1 | UI label **“Parrillero”** for `grill_master`; code/DB keep `grill_master` |
| OQ-2 | `/kitchen` is **stub-only** in this feature |
| OQ-3 | Waiter **only** `/orders`; blocked from `/dashboard`, `/inventory`, `/waste`, `/kitchen` → `/orders` |
| OQ-4 | Grill master blocked **only** from `/dashboard` → `/kitchen`; may access inventory, orders, waste, kitchen |
| OQ-5 | Proxy remains **session-only**; RBAC in Server Component gates |
| OQ-6 | Profile load failure → redirect `/login` (as designed) |
| OQ-7 | Post-onboarding redirect uses `getDefaultLandingRoute(role)` |
| OQ-8 | **Both** server gates (security) and `SessionProvider` (client query keys) |
| OQ-9 | Mutation-by-role RLS stays a **later spec**; focused migration only for staff create path |
| OQ-10 | Test users created via **admin dashboard UI** (not SQL/Studio as product path) |

## Verification

**Hybrid** — record `manual` on feature in `feature_list.json`; Vitest required for domain RBAC and validation slices.

| Surface | Method |
|---------|--------|
| RBAC matrix, login validation, create-user validation, redirect resolver | Vitest |
| Login UI, redirects, session context, app shell/sidebar, proxy behavior, admin create-user | Manual browser |
| RLS tenant smoke | Manual (L4) |

See [requirements.md](./requirements.md) acceptance criteria and [tasks.md](./tasks.md) per-task tags.

## Related docs

- [requirements.md](./requirements.md) — FR/NFR, acceptance criteria, closed decisions
- [design.md](./design.md) — flows, ports, proxy, RBAC matrix, create-user design, UI tokens
- [tasks.md](./tasks.md) — ordered implementation checklist
- [specs/merchant-onboarding/](../merchant-onboarding/) — locked onboarding decisions
- [docs/architecture.md](../../docs/architecture.md), [DESIGN.md](../../DESIGN.md), [docs/database-schema.md](../../docs/database-schema.md)
