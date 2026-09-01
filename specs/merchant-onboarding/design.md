# Design — Merchant onboarding

## Overview

Split the business spec's combined "register business + admin" flow into:

```
/register (exists)  →  Supabase Auth user
       ↓
/login / email confirm (exists)
       ↓
/onboarding (NEW, (auth) group)  →  merchants + public.users (admin)
       ↓
/dashboard (exists, (app) group)  →  operational features (future)
```

This feature adds the middle step, the bootstrap DB path, and **server** gates so incomplete users never use `(app)`.

## User flows

### Flow A — Happy path (email confirmation disabled or already confirmed)

```mermaid
sequenceDiagram
  participant U as User
  participant R as /register
  participant L as /login
  participant O as /onboarding
  participant DB as Postgres

  U->>R: email + password
  R->>U: redirect /auth/sign-up-success
  U->>L: login
  L->>U: session cookie; client may push /dashboard
  U->>O: (app) layout redirects if no profile
  U->>O: business name + optional address/phone + full name
  O->>DB: RPC create_merchant_and_admin_profile
  DB->>O: merchant_id
  O->>U: redirect /dashboard
```

### Flow B — Email confirmation required (Supabase project setting)

1. Register → `/auth/sign-up-success` (unchanged; no app-level confirmation gate).
2. User clicks email link → `/auth/confirm` → session established.
3. Set `emailRedirectTo` to `/onboarding` (preferred). Onboarding layout: no session → `/login`; already onboarded → `/dashboard`.
4. **Do not** inspect `email_confirmed_at` in application code. If the project issued a session, onboarding is allowed.

### Flow C — Returning onboarded user

1. Login → client may push `/dashboard` → profile exists → stay on `(app)`.
2. Direct visit `/onboarding` → **`(auth)/onboarding` layout** redirects `/dashboard`.

### Flow D — Authenticated, not onboarded, wrong route

1. Visit `/inventory` (or any `(app)` page) → **`(app)` layout** redirects `/onboarding`.
2. Visit `/login` while authenticated and incomplete → optional UX redirect to `/onboarding` (not required for security; `(app)` is already blocked).
3. Visit `/login` while authenticated and onboarded → optional UX redirect to `/dashboard`.

## Routing and guards

### Locked layout

| URL | Route file | Auth | Profile required | Behavior |
|-----|------------|------|------------------|----------|
| `/login`, `/register` | `(auth)/login`, `(auth)/register` | Public | No | Unchanged styling and fields |
| `/onboarding` | `(auth)/onboarding/page.tsx` | **Required** (nested layout) | **No** | Show onboarding form |
| `/onboarding` (onboarded) | same | Required | Yes (already) | Nested layout → `/dashboard` |
| `/dashboard`, `/inventory`, … | `(app)/*` | Required | **Yes** | `(app)` layout → `/onboarding` if missing |
| `/auth/*`, `/instruments` | various | Per existing proxy | No | Unchanged public exceptions |

### Guard implementation (two layouts + thin proxy)

1. **`src/shared/infrastructure/supabase/proxy.ts`**
   - Keep existing unauthenticated redirect to `/login` for protected paths.
   - **Do not** add `/onboarding` to the public allowlist (`/login`, `/register`, `/auth`, `/instruments`). Unauthenticated `/onboarding` must redirect to `/login` (AC-7).
   - **Do not** query `public.users` here (latency). Merchant completeness is **not** the proxy’s job.

2. **`src/app/(app)/layout.tsx` (Server Component)** — operational gate
   - Resolve session via server Supabase client + `getClaims()` / `getUser()`.
   - Fetch session profile through `auth` infrastructure helper (not inline SQL in the layout long-term).
   - Logic:
     ```typescript
     if (!session) redirect('/login');
     if (!profile.isOnboarded) redirect('/onboarding');
     ```
   - There is **no** `isOnboardingRoute` branch inside `(app)` because onboarding is not in this group.

3. **`src/app/(auth)/onboarding/layout.tsx` (Server Component)** — onboarding-only gate
   - Do **not** attach this to the parent `(auth)` layout (login/register must stay public).
   - Logic:
     ```typescript
     if (!session) redirect('/login');
     if (profile.isOnboarded) redirect('/dashboard');
     ```

### Login form redirect (minimal change)

`login-form.tsx` currently `router.push('/dashboard')`.

**Locked:** keep pushing `/dashboard`; rely on `(app)` layout gate (single security source of truth). One-hop redirect for incomplete users is acceptable. Do not add a client-only “if onboarded” branch as the security control.

### Register form

No merchant fields. Sign-up-success stays. Optional copy “Next, set up your business” is allowed but not required for AC.

## RLS chicken-and-egg

### Problem

Documented schema ([docs/database-schema.md](../../docs/database-schema.md)):

- `users.merchant_id UUID NOT NULL`
- RLS on `merchants`: **SELECT only** for authenticated (`id = get_user_merchant_id()`)
- RLS on `users`: **SELECT only** (`merchant_id = get_user_merchant_id()`)
- `get_user_merchant_id()` reads `users.merchant_id WHERE id = auth.uid()`

Therefore:

- An Auth user **without** a `public.users` row cannot pass tenant RLS for INSERT on any tenant-scoped table.
- Plain client `insert` into `merchants` then `users` **will fail** under documented policies.

### Locked approach — `SECURITY DEFINER` RPC

Callable by `authenticated` only:

```sql
CREATE OR REPLACE FUNCTION public.create_merchant_and_admin_profile(
  p_merchant_name text,
  p_full_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_merchant_id uuid;
  v_email text;
  v_address text;
  v_phone text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'already_onboarded';
  END IF;

  IF trim(p_merchant_name) = '' OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  v_address := NULLIF(trim(COALESCE(p_address, '')), '');
  v_phone := NULLIF(trim(COALESCE(p_phone, '')), '');

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.merchants (name, address, phone)
  VALUES (trim(p_merchant_name), v_address, v_phone)
  RETURNING id INTO v_merchant_id;

  INSERT INTO public.users (id, merchant_id, email, full_name, role)
  VALUES (v_user_id, v_merchant_id, v_email, trim(p_full_name), 'admin');

  RETURN v_merchant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_merchant_and_admin_profile(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_merchant_and_admin_profile(text, text, text, text) TO authenticated;
```

**Security properties:**

- Runs as definer but binds rows to `auth.uid()`.
- Idempotent guard via `already_onboarded`.
- No arbitrary `merchant_id` parameter from client.
- Email sourced from `auth.users`, not client input.
- Input length validation also in TypeScript domain layer before RPC call.

**Rejected alternatives:** nullable `users.merchant_id`; service-role from random client/server paths; disabling RLS.

**Application call:** `supabase.rpc('create_merchant_and_admin_profile', { p_merchant_name, p_full_name, p_address, p_phone })` from infrastructure repo only. Pass `null` (or omit) for blank optional fields — do not send empty strings.

## Data model

### Canonical tables (from docs — first migration)

Use full DDL from [docs/database-schema.md](../../docs/database-schema.md) including indexes and RLS policies, **plus** nullable merchant contact columns (see below).

### Merchant schema extension (this feature)

Canonical `docs/database-schema.md` currently defines `merchants` with `id`, `name`, `created_at` only. The first migration **must** add:

```sql
ALTER TABLE public.merchants
  ADD COLUMN address VARCHAR(255),
  ADD COLUMN phone VARCHAR(255);
```

Both columns are nullable. No default values. Match existing string column style (`VARCHAR(255)` like `name`, `email`, `full_name`).

Implementer **must update** `docs/database-schema.md` after applying the migration so the canonical doc reflects `address` and `phone`.

### MVP onboarding field mapping (locked)

| UI field (Spanish copy) | Column | Table | Required |
|-------------------------|--------|-------|----------|
| Nombre del negocio | `name` | `merchants` | Yes |
| Dirección (opcional) | `address` | `merchants` | No — NULL if omitted/blank |
| Teléfono (opcional) | `phone` | `merchants` | No — NULL if omitted/blank |
| Tu nombre completo | `full_name` | `users` | Yes |
| (from session) | `email` | `users` | — |
| (fixed) | `role = 'admin'` | `users` | — |
| (from auth) | `id` | `users` | — |

Do not add `legal_name`, `public_name`, or tax columns.

## Domain model

### New bounded context: `src/domains/merchants/`

```
merchants/
├── domain/
│   ├── entities.ts          # Merchant, OnboardingInput, OnboardingResult
│   ├── validations.ts       # validateMerchantName, validateOwnerFullName, validateOnboardingInput
│   └── repository.ts        # MerchantOnboardingRepository port
├── application/
│   └── use-cases.ts         # completeMerchantOnboarding
├── infrastructure/
│   ├── supabase-repo.ts     # rpc + error mapping
│   └── query-adapters.ts    # useCompleteOnboarding mutation
└── presentation/
    ├── components/
    │   └── onboarding-form.tsx
    └── hooks/
        └── use-onboarding-form.ts   # optional thin wrapper
```

**Entities (sketch):**

```typescript
export type Merchant = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
};

export type OnboardingInput = {
  merchantName: string;
  ownerFullName: string;
  address?: string | null;
  phone?: string | null;
};

export type OnboardingResult = {
  merchantId: string;
};
```

### Extend: `src/domains/auth/`

Session profile concern stays in auth:

```
auth/
├── domain/
│   ├── entities.ts          # SessionProfile
│   ├── repository.ts        # SessionProfileRepository
│   └── validations.ts       # (optional, minimal)
├── application/
│   └── use-cases.ts         # getSessionProfile
├── infrastructure/
│   ├── supabase-repo.ts     # select from users; used by query adapters AND server helper
│   ├── session-profile-server.ts  # server-only helper for layouts (no @supabase in src/app)
│   └── query-adapters.ts    # useSessionProfile (UX only)
```

**SessionProfile:**

```typescript
export type SessionProfile = {
  userId: string;
  email: string;
  merchantId: string | null;
  fullName: string | null;
  role: 'admin' | 'grill_master' | 'waiter' | null;
  isOnboarded: boolean;
};
```

`isOnboarded := merchantId !== null` (row exists with merchant).

### Use cases

**`completeMerchantOnboarding(input, repo)`**

1. Run domain validations.
2. Call `repo.createMerchantAndAdminProfile(input)`.
3. Map RPC errors: `already_onboarded`, `not_authenticated`, `invalid_input` → domain errors.

**`getSessionProfile(userId, repo)`**

1. Fetch profile by auth user id.
2. Return `SessionProfile` with `isOnboarded` derived.

## Infrastructure

### MerchantOnboardingRepository port

```typescript
export interface MerchantOnboardingRepository {
  createMerchantAndAdminProfile(input: OnboardingInput): Promise<OnboardingResult>;
}
```

### SessionProfileRepository port

```typescript
export interface SessionProfileRepository {
  getByUserId(userId: string): Promise<SessionProfile | null>;
}
```

Implementation notes:

- `getByUserId`: `select` from `users` where `id = userId`. No row → `{ userId, email from auth, merchantId: null, isOnboarded: false }`.
- Use generated `Database` types after migration.

### TanStack Query keys

| Key | Use |
|-----|-----|
| `['session-profile', userId]` | Profile / onboarding state (client UX) |
| `['merchant', merchantId]` | Future merchant settings reads |

On onboarding success: `invalidateQueries({ queryKey: ['session-profile', userId] })`.

## UI design

Follow [DESIGN.md](../../DESIGN.md). **Do not** copy scaffold auth card styling (`shadow-xl shadow-primary/5` from login/register). **Do not** restyle login/register.

### Onboarding page layout

- Background: `bg-background` / canvas parchment (`#fafafa` light).
- Centered column, max-width `md` (~448px).
- Single **flat** `Card`: `border border-border` (hairline), `rounded-lg` (12px), **no** drop shadow.
- Title: section_title token — `text-[28px] font-semibold tracking-tight` (weight 600, not 500).
- Helper: body_regular, muted foreground.
- Primary button: default shadcn `Button` (Flame Red via `--primary`).
- Inputs: shadcn `Input` + `Label`; `rounded-md` (8px).
- Four fields: business name (required), address (optional), phone (optional), owner full name (required).
- Optional fields: label suffix "(opcional)" or helper text; no HTML `required` attribute; no client-side block on empty submit.

### Spanish copy (product strings)

| Element | Copy |
|---------|------|
| Page title | Configura tu asadero |
| Subtitle | Cuéntanos sobre tu negocio para empezar. |
| Business name label | Nombre del negocio |
| Address label | Dirección (opcional) |
| Phone label | Teléfono (opcional) |
| Full name label | Tu nombre completo |
| Submit | Crear mi espacio |
| Loading | Creando tu espacio... |
| Error (generic) | No pudimos completar el registro. Intenta de nuevo. |
| Already onboarded | Ya tienes un negocio configurado. |

### Accessibility

- `<Label htmlFor="...">` on every input.
- Error region: `<p role="alert" className="text-sm text-destructive">`.
- Focus ring: `ring-primary` / Flame Red.
- Submit disabled while mutation pending.

### Performance budgets

| Metric | Budget | Notes |
|--------|--------|-------|
| LCP | < 2.5s | Single card, no images, no dynamic chart imports |
| CLS | < 0.1 | Fixed card width; no layout-shifting loaders |
| JS bundle | Minimal | One client form; no `next/dynamic` required |
| Server | < 200ms profile read | Indexed PK lookup on `users.id` (layouts only, not proxy) |

## App route files

| File | Responsibility |
|------|----------------|
| `src/app/(auth)/onboarding/page.tsx` | Metadata + render onboarding view container |
| `src/app/(auth)/onboarding/layout.tsx` | Server: session required; onboarded → `/dashboard` |
| `src/app/(app)/layout.tsx` | Server: session required; not onboarded → `/onboarding` |
| `src/shared/infrastructure/supabase/proxy.ts` | Unauthenticated cannot reach `(app)` or `/onboarding`; no merchant query |

## Migration deliverable (specified)

File: `supabase/migrations/<timestamp>_initial_schema_and_onboarding.sql`

Contents:

1. Extension `uuid-ossp`
2. All tables, types, indexes from `docs/database-schema.md`
3. `ALTER TABLE merchants ADD COLUMN address VARCHAR(255), ADD COLUMN phone VARCHAR(255)` (nullable)
4. RLS enable + policies from docs
5. `get_user_merchant_id()` function
6. `create_merchant_and_admin_profile` RPC (locked; accepts optional `p_address`, `p_phone`)
7. Grants on RPC
8. Update `docs/database-schema.md` to document `merchants.address` and `merchants.phone`

Implementer runs locally:

```bash
pnpm dlx supabase db reset
pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts
```

## Error handling

| Source | Client message |
|--------|----------------|
| Domain validation | Field-specific Spanish messages |
| RPC `already_onboarded` | Redirect to dashboard (treat as success path) |
| RPC `not_authenticated` | Redirect to login |
| RPC other / network | Generic retry message |
| Logs | Error code only; no email/name |

## Future consumers of `merchant_id`

Not implemented here; onboarding unblocks:

- `['raw-materials', merchantId]`
- `['orders', merchantId]`
- `(app)/layout` merchant context banner
- RBAC redirects (feature 2)

## Deferred / follow-up

| Item | Reason |
|------|--------|
| Full auth hexagonal refactor (login/register) | Out of scope; onboarding sets pattern |
| Restyle login/register to DESIGN.md | Locked deferred (decision 7) |
| Tax identifiers, tax rate, legal vs public name | Locked out of this MVP feature (decision 2–3) |
| Merchant settings edit page | Separate feature |
| Staff invites | Feature 2+ |
| App-level email confirmation gate | Locked out (decision 8) |

## File touch list (implementation reference)

| Path | Action |
|------|--------|
| `src/domains/merchants/**` | Create |
| `src/domains/auth/domain/*` | Replace placeholders |
| `src/domains/auth/infrastructure/*` | Implement profile repo, server helper, adapters |
| `src/app/(auth)/onboarding/page.tsx` | Create |
| `src/app/(auth)/onboarding/layout.tsx` | Create (server gate) |
| `src/app/(app)/layout.tsx` | Add merchant gate |
| `src/shared/infrastructure/supabase/proxy.ts` | Ensure `/onboarding` is not public |
| `supabase/migrations/*` | Initial migration + nullable `address`/`phone` |
| `docs/database-schema.md` | Update `merchants` table with nullable `address`, `phone` |
| `src/domains/auth/presentation/components/login-form.tsx` | Optional: keep `/dashboard` push; optional `emailRedirectTo` on register |

Presentation **must not** add new `@supabase/supabase-js` imports.
