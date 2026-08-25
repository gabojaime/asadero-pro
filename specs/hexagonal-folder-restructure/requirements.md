# Requirements — Hexagonal folder restructure

## Functional requirements

### FR-1 — Single App Router root

The implementer must move all route files from root `app/` to `src/app/`. After the move, **no `app/` directory may remain at the repo root** (only `src/app/`).

### FR-2 — Path alias migration

`tsconfig.json` must map `@/*` to `./src/*` (not `./*`). All imports using `@/` must resolve without manual relative-path hacks.

### FR-3 — Supabase client relocation

Move Supabase SSR helpers to the shared infrastructure path per [docs/conventions.md](../../docs/conventions.md):

| Current | Target |
|---------|--------|
| `lib/supabase/client.ts` | `src/shared/infrastructure/supabase/client.ts` |
| `lib/supabase/server.ts` | `src/shared/infrastructure/supabase/server.ts` |
| `lib/supabase/proxy.ts` | `src/shared/infrastructure/supabase/proxy.ts` |

Root `proxy.ts` must import from `@/shared/infrastructure/supabase/proxy`.

### FR-4 — Auth route group URLs

Primary auth entry URLs must match architecture:

| URL | Route file |
|-----|------------|
| `/login` | `src/app/(auth)/login/page.tsx` |
| `/register` | `src/app/(auth)/register/page.tsx` |

### FR-5 — Supabase OTP callback exception

The email OTP handler **must remain** at public URL `/auth/confirm`:

- File: `src/app/auth/confirm/route.ts`
- Uses `createClient` from `@/shared/infrastructure/supabase/server`
- Supabase Dashboard redirect URL configuration continues to target `/auth/confirm`

Document this exception in code comments if the route sits outside the `(auth)` group.

### FR-6 — Legacy auth URLs

These URLs may remain under `/auth/*` (outside `(auth)` group) without renaming:

| URL | Purpose |
|-----|---------|
| `/auth/forgot-password` | Password reset request |
| `/auth/update-password` | Password update after email link |
| `/auth/sign-up-success` | Post-registration confirmation |
| `/auth/error` | Auth error display |

### FR-7 — Protected app route group

Authenticated scaffold content moves to `(app)`:

| URL | Route file | Content |
|-----|------------|---------|
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Current `protected/page.tsx` content |
| `/inventory` | `src/app/(app)/inventory/page.tsx` | Minimal placeholder (“Coming soon”) |
| `/orders` | `src/app/(app)/orders/page.tsx` | Minimal placeholder |
| `/waste` | `src/app/(app)/waste/page.tsx` | Minimal placeholder |

`(app)/layout.tsx` inherits current `protected/layout.tsx` shell (nav, auth button, theme switcher).

### FR-8 — Public smoke route

`/instruments` must remain a **public** route (no auth redirect) and continue to load data via server `createClient`, identical in behavior to today.

File: `src/app/instruments/page.tsx` (outside route groups).

### FR-9 — Legacy URL redirects (recommended)

Add Next.js redirects (via `next.config.ts` `redirects()` or equivalent thin route stubs):

| Source | Destination |
|--------|-------------|
| `/auth/login` | `/login` |
| `/auth/sign-up` | `/register` |
| `/protected` | `/dashboard` |

Internal links in moved files should prefer canonical URLs (`/login`, `/register`, `/dashboard`).

### FR-10 — Proxy session guard

Root `proxy.ts` behavior must be preserved:

- Unauthenticated users redirected to `/login` (updated from `/auth/login`)
- Public exceptions: `/`, `/login`, `/register`, paths starting with `/auth`, `/instruments`
- SSR cookie refresh via `@supabase/ssr` unchanged

### FR-11 — Component relocation

| Category | Target |
|----------|--------|
| Auth forms (`login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`, `logout-button`) | `src/domains/auth/presentation/components/` |
| UI primitives (`components/ui/*`) | `src/shared/presentation/ui/` |
| Scaffold chrome (`auth-button`, `theme-switcher`, `deploy-button`, `env-var-warning`, logos, `hero`) | `src/shared/presentation/` |
| Tutorial steps (`components/tutorial/*`) | `src/shared/presentation/tutorial/` |

Landing page (`src/app/page.tsx`) does not use tutorial components today; tutorial files move to shared for reuse from dashboard stub content.

### FR-12 — Domain layer skeletons

Create empty hexagonal folders for MVP bounded contexts with placeholder files (no business logic):

- `src/domains/auth/`
- `src/domains/raw-materials/`
- `src/domains/orders/`
- `src/domains/metrics/`
- `src/domains/waste/`

Each context includes `domain/`, `application/`, `infrastructure/`, `presentation/` with minimal placeholder exports or `.gitkeep` as specified in [design.md](./design.md).

### FR-13 — QueryProvider in root layout

Add TanStack Query v5 provider per architecture:

- Dependency: `@tanstack/react-query` (new runtime dependency — acceptable for this slice)
- File: `src/shared/infrastructure/providers/QueryProvider.tsx`
- Wrap children in `src/app/layout.tsx` alongside existing `ThemeProvider`

No queries are required to work yet; the provider must mount without runtime errors.

### FR-14 — shadcn alias alignment

Update `components.json` aliases so future `shadcn` CLI additions resolve under `src/`:

- `ui` → `@/shared/presentation/ui`
- `components` → `@/shared/presentation`
- `utils` → `@/lib/utils`
- `tailwind.css` path → `src/app/globals.css`

### FR-15 — Cleanup

Delete empty legacy directories at repo root: `app/`, `lib/`, `components/` (after all files moved and imports updated).

## Non-functional requirements

### NFR-1 — Minimal behavioral change

This is a **mechanical restructure**. Auth flows, form validation, and Supabase calls behave as today. Do not rewrite auth into use cases in this feature.

### NFR-2 — Hexagonal checkpoint tension (documented exception)

[CHECKPOINTS.md](../../CHECKPOINTS.md) states presentation must not import `@supabase/supabase-js` directly. Moved auth forms may continue importing `@/shared/infrastructure/supabase/client` (infrastructure wrapper) exactly as the template does today. Full extraction to application layer is **explicitly deferred** to a future auth feature.

Similarly, `dashboard/page.tsx` and `instruments/page.tsx` may still call server `createClient()` until later features introduce query adapters. Document this as known scaffold debt in the progress journal.

### NFR-3 — English identifiers

All new files, folders, placeholders, and comments: English only.

### NFR-4 — No secrets in git

Do not commit `.env.local` or Supabase service-role keys.

### NFR-5 — Typecheck and lint pass

After the move:

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Must complete with zero errors attributable to this restructure.

## Acceptance criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | No root-level `app/` directory exists | File tree inspection |
| AC-2 | `@/*` resolves to `src/*` | Typecheck + dev server |
| AC-3 | `/instruments` loads without login | Manual browser |
| AC-4 | `/login` renders login form; successful login reaches `/dashboard` | Manual browser |
| AC-5 | `/register` renders sign-up form | Manual browser |
| AC-6 | `/auth/confirm` route file exists at `src/app/auth/confirm/route.ts` | File tree |
| AC-7 | Unauthenticated visit to `/dashboard` redirects to `/login` | Manual browser |
| AC-8 | `/auth/login` redirects to `/login` (if FR-9 implemented) | Manual browser |
| AC-9 | `/protected` redirects to `/dashboard` (if FR-9 implemented) | Manual browser |
| AC-10 | Domain skeleton folders exist for all five contexts | File tree |
| AC-11 | `pnpm exec tsc --noEmit` passes | CLI |
| AC-12 | `pnpm lint` passes | CLI |
| AC-13 | Root `proxy.ts` still exports `proxy` with same matcher pattern | File inspection |

## Open questions for human approval

1. **`(auth)/layout.tsx`**: Add a shared unauthenticated layout now (optional polish), or rely on per-page layouts copied from current login/register pages? **Recommendation:** skip shared `(auth)/layout.tsx` in this slice; pages already include their own shell.

2. **`orders/[orderId]` stub**: Architecture lists a dynamic orders route. **Recommendation:** defer to the orders product feature; only `/orders` placeholder in this slice.

3. **`src/shared/infrastructure/database/supabase.types.ts`**: Create an empty placeholder with a comment pointing to `pnpm dlx supabase gen types`, or omit until first migration feature? **Recommendation:** add placeholder file with generation command in comment.

4. **Duplicate `components/sign-up-form.tsx`**: Git status shows both `components/sign-up-form.tsx` and `components\sign-up-form.tsx` (Windows path duplicate). **Recommendation:** implementer deduplicates to a single file during move.

## Verification type

**Manual** browser smoke + **typecheck/lint** (not Vitest). Record results in `progress/hexagonal-folder-restructure.md`.
