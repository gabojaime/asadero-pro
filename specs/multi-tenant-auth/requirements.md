# Requirements — Multi-Tenant Authentication & Session Safeguards

## Functional requirements

### FR-1 — Preserve existing auth entry points

Login (`/login`), register (`/register`), password recovery (`/auth/forgot-password`, `/auth/update-password`), email confirm (`/auth/confirm`), and sign-up success (`/auth/sign-up-success`) **must remain** functional. Do not replace Supabase Auth or add signup/merchant fields.

### FR-2 — Hexagonal sign-in (login only)

Refactor login so presentation and `src/app/` **never import `@supabase/supabase-js`**:

1. **`AuthRepository` port** — `signInWithPassword(email, password)` returning a domain result (success or mapped auth error).
2. **Application use case** — `signIn(credentials, authRepository)` validates input then delegates.
3. **Infrastructure** — Supabase implementation in `src/domains/auth/infrastructure/`.
4. **Query adapter** — `useSignIn()` mutation consumed by `login-form.tsx`.

Register and password forms may keep direct Supabase usage **only if** out of scope for this feature; login **must** migrate.

### FR-3 — Login input validation (domain)

Add Zod schemas in `src/domains/auth/domain/validations.ts`:

- Email: trimmed, valid format, max 255.
- Password: non-empty, min length per Supabase project default (minimum 6 for local MVP unless project config differs).

Use `.safeParse()`; map issues to field-level errors for the UI.

### FR-4 — Login UI (DESIGN.md)

Restyle login form to match [DESIGN.md](../../DESIGN.md):

- Flat card: `border border-border`, `rounded-lg`, **no** `shadow-lg` / `shadow-xl`.
- Flame Red primary button and focus ring.
- Typography weights 300 / 400 / 600 / 700 only (no weight 500).
- Spanish product copy preserved or refined; code/comments English.
- Page shell at `(auth)/login/page.tsx` may stay; form card must comply with tokens.

Register page restyle is **out of scope** unless a one-line consistency fix is required.

### FR-5 — Session profile read (extend existing)

Reuse and harden the existing session profile path:

| Field | Source |
|-------|--------|
| `userId` | `auth.uid()` |
| `email` | Supabase Auth |
| `merchantId`, `fullName`, `role` | `public.users` when row exists |
| `isOnboarded` | `merchantId !== null` (profile row exists with NOT NULL `merchant_id`) |

Query key: `['session-profile', userId]` per [docs/conventions.md](../../docs/conventions.md). Align `useSessionProfile()` with this key (current adapter uses bare `['session-profile']` — fix as part of this feature).

### FR-6 — Tenant / session context (client)

Provide a **client context provider** (e.g. `SessionProvider` in `src/domains/auth/presentation/`) mounted under `(app)/layout` **after** server gates:

- Exposes `merchantId`, `role`, `userId`, `email`, `fullName`, `isLoading`, `isError`.
- Populated from `useSessionProfile()` (TanStack Query adapter), not direct Supabase in presentation.
- Used by future domain hooks for query keys: `['orders', merchantId]`, etc.

Server-side security **must not** rely on this context alone.

### FR-7 — Onboarding gate (unchanged contract)

Reuse existing server gates without weakening onboarding locks:

| Gate | Behavior |
|------|----------|
| `ProtectedSessionGate` in `(app)/layout` | No session → `/login`; not onboarded → `/onboarding` |
| `OnboardingSessionGate` in `(auth)/onboarding/layout` | No session → `/login`; onboarded → `getDefaultLandingRoute(role)` |

RBAC (FR-8) runs **after** FR-7 passes inside `(app)`.

### FR-8 — Role-based route guarding (RBAC)

When an **onboarded** user navigates within `(app)`, enforce route access by `SessionProfile.role`:

**Canonical roles:** `admin`, `grill_master`, `waiter` (PostgreSQL enum `user_role`).

**Protected route prefixes (MVP):**

| Path prefix | Purpose |
|-------------|---------|
| `/dashboard` | Financial / metrics command center (**admin only**) |
| `/inventory` | Raw materials catalog (admin, grill_master) |
| `/orders` | Order entry (all roles) |
| `/waste` | Waste logging (admin, grill_master) |
| `/kitchen` | Kitchen active queue (admin, grill_master) — **stub page in this feature** |

Unauthorized access **must** `redirect()` server-side to the role’s default landing route (see FR-9), not render a blank page or client-only hide.

Implementation: Server Component gate (e.g. `RoleRouteGate`) reading profile via `getServerSessionProfile()` and pure domain functions from `domains/auth/domain/rbac.ts` (e.g. `resolveRoleRedirect(role, pathname)`).

**Approved RBAC matrix (locked):**

| Route | `admin` | `grill_master` | `waiter` |
|-------|---------|----------------|----------|
| `/dashboard` | Allow | Deny → `/kitchen` | Deny → `/orders` |
| `/inventory` | Allow | Allow | Deny → `/orders` |
| `/orders` | Allow | Allow | Allow |
| `/waste` | Allow | Allow | Deny → `/orders` |
| `/kitchen` | Allow | Allow | Deny → `/orders` |

Deny = server `redirect()` to the redirect target in the matrix (not always the role default — e.g. waiter denied on `/inventory` goes to `/orders`).

**Nested layout role sets (declarative):**

| Layout | Allowed roles |
|--------|---------------|
| `dashboard/layout.tsx` | `admin` |
| `inventory/layout.tsx` | `admin`, `grill_master` |
| `orders/layout.tsx` | `admin`, `grill_master`, `waiter` |
| `waste/layout.tsx` | `admin`, `grill_master` |
| `kitchen/layout.tsx` | `admin`, `grill_master` |

### FR-9 — Default landing routes per role

After successful login (and after onboarding gate on first `(app)` entry), users land on:

| Role | Default route |
|------|---------------|
| `admin` | `/dashboard` |
| `grill_master` | `/kitchen` |
| `waiter` | `/orders` |

Login form post-success navigation should call domain helper `getDefaultLandingRoute(role)` when role is known client-side, or push a neutral path and let server RBAC redirect — **prefer one hop max** after profile is readable.

Onboarded user visiting `/` or `/login` may optionally redirect to role default (UX, not security boundary).

### FR-10 — Kitchen route stub

Create `src/app/(app)/kitchen/page.tsx` as a **minimal placeholder**:

- Protected by same `(app)` layout chain (session → onboarding → RBAC).
- Copy indicates kitchen queue is coming (Spanish UI string).
- No TanStack order queries or kitchen MVP logic.

Full kitchen feature remains feature 4 in the product backlog.

### FR-11 — Proxy session refresh (no profile fetch)

Keep `proxy.ts` / `updateSession()` behavior aligned with Supabase SSR guidance and onboarding lock #10:

- Refresh session via `createServerClient` + `supabase.auth.getClaims()`.
- Redirect unauthenticated users away from protected paths (not `/login`, `/register`, `/auth/*`, public exceptions).
- **`/onboarding` is not public** — unauthenticated → `/login`.
- **Do not** query `public.users` or enforce RBAC in proxy.

Profile, onboarding completeness, and RBAC belong in Server Component gates.

**Reference:** Next.js 16 `proxy.ts` convention (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`); Supabase SSR cookie pattern in `src/shared/infrastructure/supabase/proxy.ts`.

### FR-12 — Logout

Existing logout control must remain functional. If touched, route through auth infrastructure adapter (optional stretch); not blocking if unchanged.

### FR-13 — RLS reliance (no app-layer tenant filter duplication)

All data reads/writes continue through Supabase with RLS (`get_user_merchant_id()`). This feature does **not** add parallel tenant filters in UI beyond using `merchantId` in query keys.

Role-specific **mutation** RLS tightening remains **out of scope** (separate spec). A **focused migration** is in scope only for the admin staff-create path (FR-14).

### FR-14 — Admin staff user provisioning

Admins must create staff users for their **current merchant** from the dashboard UI.

**Hexagonal slice:**

1. **Domain entity** — `CreateStaffUserInput`: `email`, `password`, `fullName`, `role` (`admin` | `grill_master` | `waiter` — **admin role assignable but UI may default to staff roles**; spec allows all three enum values for flexibility).
2. **Domain validation** (Zod in `validations.ts`):
   - Email: trimmed, valid format, max 255.
   - Password: min 6 (Supabase default), max reasonable cap (e.g. 72).
   - Full name: trimmed, non-empty, max 255.
   - Role: enum `user_role` values.
3. **Port** — `StaffUserRepository.createStaffUser(input, actorMerchantId)` returning `{ userId, email, role }`.
4. **Use case** — `createStaffUser(input, actorProfile, repository)`:
   - Rejects if `actorProfile.role !== 'admin'`.
   - Rejects if `actorProfile.merchantId` is null.
   - **Never** accepts `merchantId` from client input — always uses `actorProfile.merchantId`.
5. **Infrastructure** (server-only privileged path):
   - Step A: Create Supabase Auth user via **admin client** (`auth.admin.createUser`) with `email_confirm: true` and admin-provided password. Uses `SUPABASE_SERVICE_ROLE_KEY` from server env only (`src/shared/infrastructure/supabase/admin.ts` — **not** `NEXT_PUBLIC_*`).
   - Step B: Insert `public.users` row via **`create_staff_user_profile` RPC** (SECURITY DEFINER) binding `merchant_id` to caller admin’s merchant and `id` to new Auth UID.
   - On RPC failure after Auth user created: document compensating cleanup (delete auth user) in infrastructure; map to generic domain error.
6. **Server action or route handler** — thin wrapper in infrastructure/presentation boundary calling use case; **not** callable from client with raw service role.
7. **Query adapter** — `useCreateStaffUser()` mutation for dashboard form.
8. **Dashboard UI** — admin-only panel on `/dashboard` (section or card per DESIGN.md): form fields email, password, full name, role select with Spanish labels (`Administrador`, `Parrillero`, `Mesero`).

**Approach: password (not invite).** Schema and onboarding use email+password sign-up. No invite/magic-link infrastructure exists. Admin sets initial password; staff may change via existing forgot-password flow.

**Access control:**

- Route gate: create-user UI visible only when `role === 'admin'` (server gate + hide form client-side).
- Use case: reject non-admin actors.
- RPC: `auth.uid()` must be admin of a merchant; `merchant_id` derived server-side in RPC — never from request body.
- RLS: existing SELECT on `users` for same merchant; INSERT enforced via RPC, not open INSERT policy.

**Out of scope for FR-14:** list/edit/deactivate staff, email invitation, creating users for another tenant.

### FR-15 — Role display labels (UI)

Provide a domain or presentation constant mapping:

| `UserRole` | Spanish UI label |
|------------|------------------|
| `admin` | Administrador |
| `grill_master` | Parrillero |
| `waiter` | Mesero |

Used in role select, session debug, sidebar footer role label, and nav — **not** in DB or TypeScript enum values.

### FR-16 — Authenticated app shell (`(app)` layout)

Replace the with-supabase starter chrome in `src/app/(app)/layout.tsx` with a **shadcn/ui Sidebar** shell (Base UI). Install the primitive into `src/shared/presentation/ui/` using `components.json` aliases (`ui` → `@/shared/presentation/ui` — **not** `@/components/ui`).

**Composition** (per [shadcn Sidebar docs](https://ui.shadcn.com/docs/components/base/sidebar)):

| Piece | Responsibility |
|-------|----------------|
| `SidebarProvider` | Wraps `(app)/layout` children after server gates |
| `Sidebar` | Collapsible nav panel |
| `SidebarHeader` | Merchant business name (`merchants.name`) + optional logo |
| `SidebarContent` | RBAC-filtered primary nav (FR-17) |
| `SidebarFooter` | Signed-in user display name, `ROLE_LABELS[role]`, sign-out (FR-12) |
| `SidebarInset` | Main content area for route `children` |
| `SidebarTrigger` | Opens/closes sidebar; primary mobile control |

**Install command (implementer):**

```bash
pnpm dlx shadcn@latest add sidebar
```

CLI may also add Sheet, Separator, Tooltip, or other peer primitives — accept into `src/shared/presentation/ui/`.

**Remove/replace starter chrome** from `(app)/layout.tsx`: DeployButton, “Next.js Supabase Starter” nav, AuthButton in top nav, “Powered by Supabase” footer, ThemeSwitcher in footer (if not relocated). Do **not** leave competing layout chrome.

`(auth)/login`, `(auth)/register`, `(auth)/onboarding`, and `/auth/*` recovery routes **must not** mount this sidebar.

Gate order unchanged: `ProtectedSessionGate` → `SessionProvider` → `SidebarProvider` shell → page content (RBAC nested layouts remain).

### FR-17 — Role-filtered sidebar navigation (required UX)

Sidebar nav **must** show only destinations the current role may access. Route guards (FR-8) remain the security boundary; nav hiding is **required UX**, not optional.

**Single source of truth:** derive visible routes from domain RBAC in `src/domains/auth/domain/rbac.ts` — e.g. `getNavRoutesForRole(role)` built on `isRouteAllowed`. Presentation maps routes to Spanish labels; **do not** duplicate the RBAC matrix in presentation.

**Nav items by role** (Spanish labels; hrefs are route paths):

| Role | Visible nav items |
|------|-------------------|
| `admin` | Panel (`/dashboard`), Inventario, Pedidos, Merma, Cocina, Personal (`/dashboard#personal` — scroll anchor to FR-14 create-user panel; **no new protected route**) |
| `grill_master` | Cocina, Inventario, Pedidos, Merma — **not** Panel/Dashboard |
| `waiter` | Pedidos only — minimal sidebar (Pedidos + footer user/sign-out) |

**Active route:** highlight current item via `isActive` on `SidebarMenuButton` (prefix match inherits parent route policy, same as FR-8).

**Admin “Personal” item:** links to existing dashboard create-user surface (FR-14). Do not add `/staff` or similar unless RBAC matrix is formally extended (not in scope).

Suggested label map (presentation constant):

| Path | Spanish label |
|------|---------------|
| `/dashboard` | Panel |
| `/inventory` | Inventario |
| `/orders` | Pedidos |
| `/waste` | Merma |
| `/kitchen` | Cocina |
| `/dashboard#personal` | Personal |

### FR-18 — Mobile-first sidebar behavior

Mobile is a **first-class target** (waiters, parrilleros, floor admins on phones).

| Behavior | Requirement |
|----------|-------------|
| Mobile collapse mode | **`offcanvas`** — sidebar slides from edge; does not persistently occupy viewport width |
| Desktop collapse | `icon` mode acceptable if it respects DESIGN.md (flat surfaces, no heavy shadows) |
| Mobile top bar | Compact bar inside `SidebarInset` with `SidebarTrigger` (hamburger); full-width content below |
| Overlay | Use shadcn Sidebar built-in sheet/overlay — **do not** invent a second drawer |
| After navigation | Close mobile overlay on link select (`setOpenMobile(false)` or equivalent) |
| Keyboard shortcut | `cmd/ctrl+b` toggle is optional bonus — **not** primary mobile control |
| Interactions | No hover-only actions; all nav and trigger actions work via tap |

### FR-19 — Sidebar theming (DESIGN.md)

Map shadcn `--sidebar-*` CSS variables in `src/app/globals.css` to [DESIGN.md](../../DESIGN.md) tokens — **not** default shadcn gray demo palette.

| Token intent | DESIGN.md mapping |
|--------------|-------------------|
| Sidebar background | `surface.card_pearl` / dark `card_tile_1` via `--card` / `--background` |
| Sidebar foreground | `--foreground` / ink tokens |
| Sidebar border | `--border` hairline |
| Sidebar accent / active item | Flame Red `#e11d48` (`--primary`) — **only** interactive accent |
| Focus ring | `--ring` → primary |

Flat surfaces, hairline borders, **no** `shadow-lg` / `shadow-xl` on sidebar panels. Font weights 300 / 400 / 600 / 700 only.

### FR-20 — Merchant branding in sidebar header

`SidebarHeader` displays the tenant merchant business name from `merchants.name` for the session’s `merchantId`.

Implementation options (pick one):

1. Extend `SessionProfile` / `getServerSessionProfile` with `merchantName` via join on profile read, **or**
2. Lightweight TanStack query `['merchant', merchantId]` in `SessionProvider` via merchants infrastructure adapter.

Fallback while loading: skeleton or truncated placeholder — no raw UUID.

### FR-21 — `(app)` vs `(auth)` layout separation

| Route group | Shell |
|-------------|-------|
| `(app)/*` | Sidebar shell (FR-16) after gates |
| `(auth)/*`, `/auth/*` | No sidebar; existing auth/onboarding layouts unchanged |

## Non-functional requirements

### NFR-1 — Security boundary

- Auth: proxy/session cookie + Server Component `redirect()` for onboarding and RBAC.
- Client context is for UX and query keys only.
- Generic login and create-user error messages in Spanish; no credential, stack, or service-role leakage.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser** or `'use client'` modules.
- Presentation and `src/app/` **must not** import `@supabase/supabase-js`.
- Admin create-user: defense in depth — UI gate + use case + RPC admin check + tenant-bound `merchant_id`.
- Rate limiting: rely on Supabase Auth defaults for MVP.

### NFR-2 — Multi-tenant isolation

Authenticated queries must only return rows for the user’s `merchant_id` via RLS. Admin-created staff rows must always carry the **admin’s** `merchant_id`. Manual smoke: user A cannot read merchant B data ([docs/verification.md](../../docs/verification.md) L4).

### NFR-3 — Performance

| Surface | Budget |
|---------|--------|
| Login page LCP | < 2.5s mid-tier mobile (no charts) |
| Proxy | No extra DB round-trip |
| `(app)` layout gates | Profile read = single PK lookup on `users.id` |
| Session context | One TanStack query per session; staleTime reasonable (e.g. 60s) |
| Create-user mutation | Single Auth admin call + single RPC; no N+1 |

### NFR-4 — Accessibility

Login, create-user forms, and **app shell sidebar**: labels, `role="alert"` on errors, keyboard submit, visible focus ring (Flame Red).

Sidebar-specific:

- `SidebarTrigger` has accessible name (e.g. `aria-label="Abrir menú"` / `"Cerrar menú"`).
- Nav items are keyboard-focusable with visible focus ring.
- No hover-only actions on mobile nav or footer sign-out.
- Mobile overlay traps focus per shadcn Sidebar / Sheet behavior; Esc closes overlay.

### NFR-7 — Mobile-first layout (app shell)

| Requirement | Target |
|-------------|--------|
| Viewport width | Usable one-handed at ~375px |
| Content width | Full width on mobile — sidebar not persistently occupying space |
| Horizontal scroll | None on primary `(app)` flows |
| Touch targets | ≥ 44px height/width for `SidebarTrigger` and `SidebarMenuButton` items |
| Viewport height | Use `h-svh` / `min-h-svh`; respect safe-area insets where SidebarInset top bar meets device edge |
| Overlay lifecycle | Closes after nav selection (FR-18) |

### NFR-5 — Language

Code, SQL, comments, specs: English. Product UI strings: Spanish.

### NFR-6 — Immutability & hexagonal layers

Per [docs/conventions.md](../../docs/conventions.md) and [CHECKPOINTS.md](../../CHECKPOINTS.md). Domain RBAC and validation logic is pure TypeScript — no React/Supabase imports.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Valid credentials sign in; invalid credentials show generic Spanish error | Manual L1 |
| AC-2 | `login-form.tsx` and `(auth)/login/page.tsx` do not import `@supabase/supabase-js` | Grep / review |
| AC-3 | Login card uses flat hairline border; no `shadow-xl` / `shadow-lg` on primary card | Manual L2 + DESIGN.md |
| AC-4 | Unauthenticated user cannot access `(app)` routes | Manual L2 |
| AC-5 | Authenticated non-onboarded user hitting `(app)` → `/onboarding` (unchanged) | Manual L2 |
| AC-6 | Onboarded `admin` can access `/dashboard`, `/inventory`, `/orders`, `/waste`, `/kitchen` | Manual L2 |
| AC-7 | Onboarded `grill_master` visiting `/dashboard` redirects to `/kitchen` | Manual L2 |
| AC-8 | Onboarded `waiter` visiting `/dashboard` redirects to `/orders` | Manual L2 |
| AC-9 | `grill_master` can access `/inventory`, `/orders`, `/waste`, `/kitchen` | Manual L2 |
| AC-10 | `grill_master` default landing after login is `/kitchen` | Manual L2 |
| AC-11 | `waiter` can access `/orders` only; `/inventory`, `/waste`, `/kitchen` redirect to `/orders` | Manual L2 |
| AC-12 | `waiter` default landing after login is `/orders` | Manual L2 |
| AC-13 | `/kitchen` stub renders for admin and grill_master without errors | Manual L2 |
| AC-14 | `SessionProvider` exposes `merchantId` and `role` to client children under `(app)` | Manual L2 |
| AC-15 | Proxy does not query `public.users` (code review) | Review |
| AC-16 | Admin can create staff user from dashboard with email, password, full name, role | Manual L2 |
| AC-17 | Created staff user has `merchant_id` matching admin’s merchant (DB or profile read) | Manual L2 / L4 |
| AC-18 | New staff user can sign in with provided credentials and lands on role default route | Manual L2 |
| AC-19 | `waiter` and `grill_master` cannot access create-user UI or invoke create use case | Manual L2 |
| AC-20 | Create-user presentation/app paths do not import `@supabase/supabase-js` | Grep / review |
| AC-21 | Domain RBAC, login validation, and create-user validation tests pass (`pnpm test`) | Vitest |
| AC-22 | RLS smoke: tenant A user cannot SELECT merchant B row | Manual L4 |
| AC-23 | `pnpm exec tsc --noEmit` and `pnpm lint` pass | CLI |
| AC-24 | `(app)/layout` renders shadcn Sidebar shell; starter DeployButton / Supabase footer chrome removed | Manual L2 |
| AC-25 | `(auth)/login` and `(auth)/onboarding` render **without** sidebar | Manual L2 |
| AC-26 | Admin sidebar shows Panel, Inventario, Pedidos, Merma, Cocina, Personal; all links reachable | Manual L2 |
| AC-27 | `grill_master` sidebar shows Cocina, Inventario, Pedidos, Merma only — **no** Panel/Dashboard link | Manual L2 |
| AC-28 | `waiter` sidebar shows Pedidos only (+ footer user/sign-out) | Manual L2 |
| AC-29 | Blocked routes do **not** appear in sidebar for any role | Manual L2 |
| AC-30 | Active nav item highlighted on current route (`isActive`) | Manual L2 |
| AC-31 | Mobile (~375px): hamburger opens offcanvas overlay; content full width; no persistent sidebar column | Manual L2 |
| AC-32 | Mobile: selecting a nav link closes overlay | Manual L2 |
| AC-33 | Mobile: trigger and menu items meet ≥ 44px touch targets | Manual L2 |
| AC-34 | No horizontal scroll on `(app)` shell at 375px | Manual L2 |
| AC-35 | Sidebar uses DESIGN.md tokens; Flame Red active/focus accent; no heavy shadows on sidebar | Manual L2 + DESIGN.md |
| AC-36 | Sidebar footer shows user name, Spanish role label (`ROLE_LABELS`), and working sign-out | Manual L2 |
| AC-37 | Sidebar header shows merchant business name | Manual L2 |
| AC-38 | Admin “Personal” nav item navigates to dashboard create-user panel (FR-14) | Manual L2 |
| AC-39 | `getNavRoutesForRole` (or equivalent) tests pass if added to domain RBAC | Vitest |

## Closed decisions

All former open questions are **closed**. No blocking questions remain.

### OQ-1 — Role display aliases

**Decision:** UI shows localized label **“Parrillero”** for `grill_master`. Code, DB, and TypeScript keep `grill_master`. Implement `ROLE_LABELS` constant (FR-15).

### OQ-2 — Kitchen route scope

**Decision:** **Stub-only** in this feature until feature 4 (Hexagonal Order & Kitchen Queue). Grill master lands on `/kitchen` stub.

### OQ-3 — Waiter denied routes

**Decision:** Waiter **only** sees `/orders`. Blocked from `/dashboard`, `/inventory`, `/waste`, `/kitchen` → redirect `/orders`.

### OQ-4 — Grill_master denied routes

**Decision:** Grill master blocked **only** from `/dashboard` → redirect `/kitchen`. May access `/inventory`, `/orders`, `/waste`, `/kitchen`. May register waste (merma).

### OQ-5 — Proxy vs layout for RBAC

**Decision:** Proxy **session-only**; onboarding locks preserved; no `public.users` in proxy. RBAC in `(app)` Server Component gates.

### OQ-6 — Default landing when role is unknown / profile load failure

**Decision:** Should not occur for onboarded users (`role` NOT NULL). On profile read failure after session exists, redirect `/login` (existing spec behavior).

### OQ-7 — Onboarding complete redirect target

**Decision:** `OnboardingSessionGate` redirects onboarded users to `getDefaultLandingRoute(role)` instead of hardcoded `/dashboard`.

### OQ-8 — Session context vs server-only

**Decision:** **Both** — server gates for security; `SessionProvider` for client query keys and UX.

### OQ-9 — RLS mutation tightening

**Decision:** Route guards only in this feature. Role-specific mutation RLS is a **later spec**. Focused migration allowed **only** for staff-create RPC (FR-14).

### OQ-10 — Test users for RBAC manual verification

**Decision:** Product path is **admin dashboard create-user UI**. SQL/Studio documented as emergency dev fallback only — not acceptance criteria.

## Verification type

Feature flag in `feature_list.json`: **`manual`**.

| Slice | Tag |
|-------|-----|
| RBAC matrix, login validation, create-user validation, redirect resolver | `vitest` |
| Login UI, redirects, session provider, app shell/sidebar, proxy, create-user, RLS smoke | `manual` |
| Nav route helper (`getNavRoutesForRole`) if added | `vitest` |

Record hybrid verification in `progress/multi-tenant-auth.md` during implementation.
