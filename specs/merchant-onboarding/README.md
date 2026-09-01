# Merchant onboarding

Post-authentication flow where a signed-in user registers their BBQ business (merchant/tenant) and receives an `admin` profile linked to `merchant_id`. Unblocks all multi-tenant operational features (inventory, orders, metrics).

## Problem

Supabase Auth signup and login **already exist** at `/register` and `/login`. They create an `auth.users` row only. They do **not**:

- Insert into `merchants`
- Insert into `public.users`
- Set `role = 'admin'` or attach `merchant_id`
- Gate `(app)` routes until onboarding completes

The business spec ([docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §1) describes tenant creation and root admin registration as **one combined flow**. The codebase split that into two phases:

| Phase | Status | What it does |
|-------|--------|--------------|
| **Auth signup/login** | **Exists** | Email/password via Supabase Auth; redirects to `/dashboard` or `/auth/sign-up-success` |
| **Merchant onboarding** | **This feature** | Collect business + owner profile; bootstrap `merchants` + `public.users`; gate `(app)` |

Without this feature, authenticated users reach `(app)` with no tenant context. RLS (`get_user_merchant_id()`) and future query keys (`['orders', merchantId]`) cannot work.

## Goals

1. Allow an authenticated user (no `public.users` row yet) to create **one** merchant and link themselves as **`admin`**.
2. Introduce hexagonal ports/adapters for onboarding (no direct `@supabase/supabase-js` in presentation for the **new** path).
3. Gate operational `(app)` routes until onboarding completes. Incomplete users may only use `/onboarding` (under `(auth)`) plus existing auth/recovery URLs.
4. Ship the **first Supabase migration** (schema + RLS + bootstrap RPC) as specified — implementer applies after human **implementation** approval, not during spec phase.
5. Provide Vitest coverage for pure domain validations.

## Locked product decisions (human, 2026-08-25)

Open questions from the first spec draft are **resolved**. Details in [requirements.md](./requirements.md) § Resolved decisions.

| # | Lock |
|---|------|
| 1 | Auth user may exist without `public.users` until onboarding. Incomplete users are sent to `/onboarding` and kept out of `(app)`. Auth/recovery routes stay available. |
| 2 | No taxes: do not model RFC/NIT, tax rate, or tax config. No extra columns. |
| 3 | Single `merchants.name` (no legal vs public split). |
| 4 | `merchants.address` and `merchants.phone` exist as **nullable** columns (migration required). Onboarding form collects them as **optional** fields; submit succeeds with empty values; omitted/blank values persist as **NULL** (not empty strings). |
| 5 | Single owner; no invitations. |
| 6 | Bootstrap via `SECURITY DEFINER` RPC using `auth.uid()`. Keep `merchant_id` NOT NULL. No ad-hoc service-role from client paths. |
| 7 | Do not restyle login/register. Business fields live on the onboarding form only. |
| 8 | **Do not block onboarding on email confirmation** in app code for local/MVP. Follow existing Auth confirm flow; no extra `email_confirmed_at` gate. |
| 9 | Route: `src/app/(auth)/onboarding` at `/onboarding` — **not** `(app)/onboarding`. |
| 10 | Security gate is **server-side** (layouts + proxy session allowlist). Not a client-only branch after login. |

## What already exists vs what will be added

### Already exists (do not rebuild)

| Asset | Location | Notes |
|-------|----------|-------|
| Login page + form | `src/app/(auth)/login/page.tsx`, `domains/auth/presentation/components/login-form.tsx` | `signInWithPassword`; redirects `/dashboard` |
| Register page + form | `src/app/(auth)/register/page.tsx`, `sign-up-form.tsx` | `signUp`; no full name; no DB profile |
| Password recovery | `src/app/auth/forgot-password`, `update-password` | Keep as-is |
| Email OTP confirm | `src/app/auth/confirm/route.ts` | Keep as-is |
| Sign-up success | `src/app/auth/sign-up-success/page.tsx` | Keep as-is |
| Session proxy | `proxy.ts`, `src/shared/infrastructure/supabase/proxy.ts` | Auth cookie only; **no** merchant check yet |
| `(app)` scaffold | `dashboard`, `inventory`, `orders`, `waste` | Tutorial/placeholders |
| Auth domain skeleton | `src/domains/auth/domain/*` | Placeholders (`export {}`) |
| Canonical schema (docs) | `docs/database-schema.md` | `merchants.name` only; `users.merchant_id` NOT NULL — **no migrations folder yet** |

### Will be added

| Asset | Purpose |
|-------|---------|
| `src/domains/merchants/` | Bounded context: entities, validations, ports, use cases, repo, query adapters, onboarding UI |
| `src/domains/auth/` (extend) | Session profile port + use case to read onboarding state |
| `src/app/(auth)/onboarding/` | Onboarding page + **server layout** (session required; onboarded users redirected into `(app)`) |
| Migration SQL (specified) | Initial DDL from `docs/database-schema.md` + nullable `merchants.address`/`phone` + bootstrap RPC + RLS |
| `(app)/layout` + proxy | Incomplete users cannot enter operational pages; unauthenticated cannot use `(app)` |
| Generated types | After migration apply |
| Domain Vitest tests | Merchant + profile validation rules |

### Known architecture debt (partially addressed)

Existing login/register forms import `createClient` from shared Supabase infrastructure directly in presentation. **This feature** must use query adapters for onboarding. Login may keep `router.push('/dashboard')`; the **server** gate is the source of truth. **Full** auth hexagonal extraction is deferred ([tasks.md](./tasks.md)).

## Roles affected

| Role | This feature |
|------|--------------|
| **`admin`** | **In scope** — root owner created at onboarding (`role = 'admin'`) |
| `grill_master` | Out of scope — MVP feature 2 (RBAC redirects) |
| `waiter` | Out of scope — MVP feature 2 |

No staff invites. Single owner per merchant at bootstrap.

## In scope

- Merchant/tenant creation and admin profile linking
- Onboarding UI per [DESIGN.md](../../DESIGN.md) (flat card, Flame Red accent, no heavy shadows)
- Session/profile read path to detect onboarding completion
- Server gating: `(app)` requires merchant; `(auth)/onboarding` requires session and **rejects** users who already have a merchant
- Hexagonal: domain validations, application use cases, Supabase repo, TanStack Query adapters
- Migration specification (DDL + RLS + `SECURITY DEFINER` bootstrap RPC)
- Post-login / post-confirm redirect **adjustments** so the server gate sends non-onboarded users to `/onboarding`
- Manual verification of redirects and RLS smoke; Vitest for domain validations

## Out of scope

- MVP feature 2: RBAC route guards for `grill_master` / `waiter`
- Inventory, orders, waste, dashboard metrics implementation (they **consume** `merchant_id` later)
- Staff invites, multi-owner, merchant switching
- Restyling login/register to DESIGN.md
- Tax identifiers, tax rates, and legal vs public name (no extra columns for taxes or name split)
- Replacing Supabase Auth or stuffing merchant fields into `/register`
- App-level email-confirmation gate before onboarding
- Applying migrations during spec phase
- Cypress/Playwright E2E suite

## Verification

**Hybrid** (document in `feature_list.json` as `manual` per harness enum; automated slice noted in requirements):

| Surface | Method |
|---------|--------|
| Domain validations | Vitest (`vitest` tasks) |
| UI, redirects, layout/proxy gate, RLS smoke | Manual browser (`manual` tasks) |

See [requirements.md](./requirements.md) acceptance criteria and [tasks.md](./tasks.md) per-task tags.

## Related docs

- [requirements.md](./requirements.md) — FR/NFR, acceptance criteria, resolved decisions
- [design.md](./design.md) — flows, data model, RLS bootstrap, UI, ports, routing
- [tasks.md](./tasks.md) — ordered implementation checklist
- [docs/business/mvp-features-spec.md](../../docs/business/mvp-features-spec.md) §1
- [docs/database-schema.md](../../docs/database-schema.md)
- [docs/architecture.md](../../docs/architecture.md)
- [DESIGN.md](../../DESIGN.md)
