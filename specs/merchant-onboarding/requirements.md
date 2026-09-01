# Requirements — Merchant onboarding

## Functional requirements

### FR-1 — Preserve existing auth entry points

Login (`/login`), register (`/register`), forgot/update password, `/auth/confirm`, and `/auth/sign-up-success` **must remain** functional. Do not remove or replace Supabase Auth signup/login. Do **not** restyle login/register in this feature. Do **not** add merchant/business fields to `/register`.

### FR-2 — Post-auth merchant onboarding

An **authenticated** user who has no `public.users` row (or no resolvable `merchant_id`) must complete onboarding. Fields:

| Field | Domain | Required |
|-------|--------|----------|
| Business name | `merchants.name` | **Yes** — single name (no legal/public split) |
| Address | `merchants.address` | **No** — optional; nullable column |
| Phone | `merchants.phone` | **No** — optional; nullable column |
| Owner full name | `users.full_name` | **Yes** |

**Not collected** (out of scope; no columns): RFC/NIT, tax rate, tax config, legal name, public name.

Email comes from Supabase Auth (`auth.users.email`); do not re-collect.

### FR-3 — Bootstrap merchant and admin profile

On successful onboarding submission:

1. Insert one row into `merchants` (`name` required; `address` and `phone` optional — NULL when omitted/blank).
2. Insert one row into `public.users` where:
   - `id = auth.uid()`
   - `merchant_id` = new merchant UUID (**NOT NULL**; do not relax this)
   - `email` = authenticated user's email (from `auth.users`, not client input)
   - `full_name` = submitted owner name
   - `role = 'admin'`
3. Operation must be **atomic** (single transaction).
4. User must **not** be able to create a second merchant/profile if one already exists (idempotent guard).

**Mechanism (locked):** `SECURITY DEFINER` RPC `create_merchant_and_admin_profile(...)` invoked from infrastructure only, binding rows to `auth.uid()`. Do **not** use nullable `merchant_id`. Do **not** call service-role from client, presentation, or ad-hoc App Router paths. See [design.md](./design.md).

### FR-4 — Onboarding route (`(auth)` group)

Dedicated page at URL `/onboarding`:

- File: `src/app/(auth)/onboarding/page.tsx` (and a nested **server** layout under that folder).
- **Not** `src/app/(app)/onboarding/`.

The page is a view container; form and mutation logic live in `domains/merchants/presentation/`.

### FR-5 — Server gates (not client-only)

**Security boundary is server-side.** A client-only branch after login is insufficient.

| Actor | `(app)` operational routes | `/onboarding` (`(auth)`) | `/login`, `/register`, `/auth/*` |
|------|----------------------------|---------------------------|----------------------------------|
| Unauthenticated | Redirect `/login` | Redirect `/login` | Allowed |
| Authenticated, no `public.users` | Redirect `/onboarding` | Show form | Allowed (auth recovery). Optional UX: if already signed in, login/register may redirect to `/onboarding`. |
| Authenticated, onboarded | Allowed | Redirect `/dashboard` | Optional UX: redirect `/dashboard` |

**Where the checks live:**

1. **`src/app/(app)/layout.tsx` (Server Component)** — **must** reject users without a merchant (`redirect('/onboarding')`). Unauthenticated → `/login`. This layout must **not** treat `/onboarding` as an `(app)` child (onboarding is not in this group).
2. **`src/app/(auth)/onboarding/layout.tsx` (Server Component)** — **must** require a session; **must** reject users who already have a merchant (`redirect('/dashboard')`). Do **not** put this gate on the whole `(auth)` group (login/register stay public).
3. **`src/shared/infrastructure/supabase/proxy.ts`** — session cookie / `getClaims()` only for **unauthenticated** access to `(app)` (existing behavior). Add `/onboarding` to the **authenticated-required** set (it must **not** be a public exception like `/login`). **Do not** query `public.users` in the proxy (keep it fast). Merchant completeness is enforced in the two layouts above.

Login form may keep `router.push('/dashboard')`; the `(app)` layout gate is the source of truth (one extra hop is acceptable).

### FR-6 — Post-login, post-confirm, email confirmation (Q8)

Adjust auth success paths so non-onboarded users land on `/onboarding` via the server gate:

| Entry | Current behavior | Target behavior |
|-------|------------------|-----------------|
| Login form success | `/dashboard` | Push `/dashboard`; layout redirects incomplete users to `/onboarding` |
| Email confirm (`/auth/confirm`) | Often `/dashboard` via `emailRedirectTo` | Prefer `emailRedirectTo` → `/onboarding` so a new session hits the onboarding layout; onboarded users are bounced to `/dashboard` |
| Register → sign-up-success | Static success page | **Unchanged** page. Optional one-line copy is allowed; **not** required. No merchant fields. |

**Email confirmation (locked):** Do **not** block onboarding in application code on `email_confirmed_at` (or equivalent) for local/MVP. Schema/docs do not require it.

- If the Supabase project **requires** confirmation, the user completes `/auth/confirm` first, then has a session and proceeds to `/onboarding`. Keep existing confirm route.
- If confirmation is **disabled** (typical local), signup/login can yield a session immediately; onboarding proceeds.
- If a session exists with an unconfirmed email, **allow** onboarding (no extra app gate).

### FR-7 — Session profile read

Expose a read path for the current user's onboarding state:

- Input: authenticated user id (from session claims server-side; from auth session client-side).
- Output: `{ userId, email, merchantId?, fullName?, role?, isOnboarded: boolean }`.

Query key: `['session-profile', userId]` per [docs/conventions.md](../../docs/conventions.md).

Port lives in `auth` domain (session concern); merchant creation lives in `merchants` domain.

Server layouts use a **server** helper in `auth/infrastructure` (not inline SQL in `src/app/`). Client UI may use the TanStack Query adapter for loading states only — not as the security gate.

### FR-8 — Hexagonal boundaries for new code

For onboarding **and** session profile reads introduced by this feature:

- `presentation/` and `src/app/` **must not** import `@supabase/supabase-js`.
- Mutations go through application use cases → infrastructure repository.
- Client UI uses TanStack Query adapters in `infrastructure/query-adapters.ts`.

Existing login/register direct Supabase usage may remain (deferred debt).

### FR-9 — Initial database migration (specified, not applied in spec phase)

Implementer creates the **first** migration under `supabase/migrations/` containing:

- Full DDL from [docs/database-schema.md](../../docs/database-schema.md) (all tables, indexes, RLS enablement, policies as documented).
- **Additional nullable columns** on `merchants`: `address VARCHAR(255)`, `phone VARCHAR(255)` (see [design.md](./design.md)). **No** extra columns for taxes or name split.
- `create_merchant_and_admin_profile` `SECURITY DEFINER` RPC per [design.md](./design.md) — accepts optional `address` and `phone`; persists NULL when omitted or blank.
- `GRANT EXECUTE` on bootstrap RPC to `authenticated` role only.

After apply: regenerate `src/shared/infrastructure/database/supabase.types.ts`.

**Update [docs/database-schema.md](../../docs/database-schema.md)** to reflect the new `merchants.address` and `merchants.phone` nullable columns when implementing (canonical doc must stay in sync with applied migration). Escalate to leader only if a documented DDL bug unrelated to this change is found.

### FR-10 — Domain validations

Pure TypeScript validations (no I/O):

- Merchant/business name: non-empty, trimmed, max length 255.
- Owner full name: non-empty, trimmed, max length 255.
- Address (optional): if provided, trimmed, max length 255; empty/whitespace-only → treat as omitted (NULL at persistence).
- Phone (optional): if provided, trimmed, max length 255; empty/whitespace-only → treat as omitted (NULL at persistence).

Invalid input returns structured domain errors consumed by the UI (generic user-facing messages; no PII in logs).

### FR-11 — Logout during onboarding

Authenticated-but-not-onboarded users must be able to log out (existing logout control or link on the onboarding page).

## Non-functional requirements

### NFR-1 — Multi-tenant isolation

After onboarding, all operational queries rely on `merchant_id` via RLS (`get_user_merchant_id()`). Bootstrap path must not allow cross-tenant writes or reading other merchants' data.

### NFR-2 — Security

- Validate at server boundary (use case + RPC checks); never trust client-only validation.
- Route gating is server-side (FR-5).
- No `SUPABASE_SERVICE_ROLE_KEY` in client bundles, `'use client'` modules, or random server actions for bootstrap.
- `SECURITY DEFINER` RPC: verify `auth.uid()` is not null; verify no existing `public.users` row for caller; fixed `search_path`; minimal privileges.
- Generic error messages to client ("Could not complete setup"); log details server-side without PII.
- One merchant per first-time user at bootstrap (no tenant sprawl from repeated RPC calls).

### NFR-3 — Performance

Onboarding is a single-form page. Target: LCP < 2.5s on mid-tier mobile (no charts, no heavy dynamic imports). See [design.md](./design.md) performance budgets. Proxy must not add a `public.users` round-trip.

### NFR-4 — Accessibility

Labels associated with inputs; submit errors use `role="alert"`; keyboard-operable form; focus visible with Flame Red ring per DESIGN.md.

### NFR-5 — Language

Code, SQL, comments, specs: English. Product copy on onboarding UI: Spanish (consistent with existing auth forms).

### NFR-6 — Immutability and Clean Code

Follow [docs/conventions.md](../../docs/conventions.md) and [CHECKPOINTS.md](../../CHECKPOINTS.md).

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | New user registers via `/register`, then (if project requires it) confirms email via existing `/auth/confirm`, logs in if needed, completes onboarding form. App does **not** add its own confirmation blocker. | Manual L1 |
| AC-2 | After onboarding, `merchants` and `public.users` rows exist; `users.role = 'admin'`; `users.id = auth.uid()` | Manual L2 + SQL/Studio |
| AC-3 | Authenticated user without profile visiting `/dashboard` (or other `(app)` routes) is redirected to `/onboarding` by **server** `(app)` layout | Manual L2 |
| AC-4 | Onboarded user visiting `/onboarding` is redirected to `/dashboard` by **server** `(auth)/onboarding` layout | Manual L2 |
| AC-5 | Onboarded user accesses `/dashboard` without redirect loop | Manual L2 |
| AC-6 | Second onboarding attempt for same auth user fails gracefully (no duplicate merchant) | Manual L2 |
| AC-7 | Unauthenticated user visiting `/onboarding` redirects to `/login` (proxy and/or onboarding layout) | Manual L2 |
| AC-8 | Onboarding UI uses flat card, hairline border, no `shadow-lg`/`shadow-xl`; Flame Red primary; login/register appearance unchanged | Manual L2 + DESIGN.md |
| AC-9 | Presentation onboarding path does not import `@supabase/supabase-js` | Code review / grep |
| AC-10 | Domain validation tests pass (`pnpm test`) | Automated |
| AC-11 | RLS: onboarded user A cannot SELECT merchant B's row (local two-user smoke when feasible) | Manual L4 |
| AC-12 | `pnpm exec tsc --noEmit` and `pnpm lint` pass after implementation | CLI |
| AC-13 | Unauthenticated user cannot stay on `(app)` routes | Manual L2 |
| AC-14 | Onboarding form shows optional address and phone fields (labeled as optional); user can submit with both empty | Manual L2 |
| AC-15 | When address/phone are omitted or blank, stored values are NULL (not empty strings) | Manual L2 + SQL/Studio |
| AC-16 | When address/phone are provided, trimmed values are persisted on `merchants` row | Manual L2 + SQL/Studio |

## Resolved decisions (formerly open questions)

All items below were locked by the human on 2026-08-25. Do not reopen without a new spec patch.

1. **Auth without `public.users`:** **Yes.** Interim state after signup is Auth-only. Redirect incomplete users to `/onboarding`. They may still use existing auth/recovery routes. They must not use operational `(app)` pages.

2. **Taxes:** **None.** Do not model RFC/NIT, tax rate, or tax config. Do not add columns “for later”.

3. **Merchant name:** **Single** `merchants.name`. No legal vs public split. UI label: "Nombre del negocio".

4. **Address and phone:** **Optional on the form; nullable in the database.** Migration adds `merchants.address VARCHAR(255) NULL` and `merchants.phone VARCHAR(255) NULL`. Onboarding form shows both fields as optional; submit succeeds without them. Omitted or blank values persist as **NULL** (not empty strings). Implementer updates `docs/database-schema.md` to match applied migration.

5. **Single owner:** **Yes.** No invitations in this feature. One bootstrap `admin` per merchant.

6. **Bootstrap:** **`SECURITY DEFINER` RPC** with `auth.uid()`. Keep `merchant_id` NOT NULL. No ad-hoc service-role from client paths.

7. **Login/register restyle:** **No.** Only add fields if strictly necessary for the flow; business fields belong on onboarding, not register.

8. **Email confirmation:** Original spec did **not** recommend blocking (Flow B left it open). **Chosen lock:** do **not** block onboarding on email confirmation in app code for local/MVP. Keep `/auth/confirm` and `/auth/sign-up-success` as they are; optionally set `emailRedirectTo` to `/onboarding`. Rely on Supabase project Auth settings for whether signup waits for confirmation.

9. **Route group:** **`(auth)/onboarding`**, URL `/onboarding`. Not `(app)/onboarding`.

10. **Login redirect / gate:** **Server layout gate** as security boundary. Client query adapters only for UX. Proxy: session-only; no merchant DB lookup.

## Verification type

Record on feature: **`manual`** (harness enum). This feature also **requires Vitest** for domain validations per [CHECKPOINTS.md](../../CHECKPOINTS.md) — document hybrid verification in progress journal:

| Slice | Tag |
|-------|-----|
| Domain validations | `vitest` |
| UI, redirects, RLS, migration apply | `manual` |
