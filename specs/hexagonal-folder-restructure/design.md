# Design — Hexagonal folder restructure

## Overview

Mechanical migration from the bootstrap layout (root `app/`, `lib/`, `components/`) to the canonical tree in [docs/architecture.md](../../docs/architecture.md). No new bounded-context behavior; preserve Supabase SSR and proxy semantics.

## Target directory tree (after move)

```
src/
├── app/
│   ├── layout.tsx                    # Root: fonts, ThemeProvider, QueryProvider, globals.css
│   ├── page.tsx                      # Public landing
│   ├── globals.css
│   ├── favicon.ico
│   ├── opengraph-image.png
│   ├── twitter-image.png
│   ├── instruments/page.tsx          # Public smoke test (KEEP)
│   ├── (auth)/
│   │   ├── login/page.tsx            # /login
│   │   └── register/page.tsx         # /register
│   ├── (app)/
│   │   ├── layout.tsx                # Former protected layout
│   │   ├── dashboard/page.tsx        # Former protected page
│   │   ├── inventory/page.tsx        # Stub
│   │   ├── orders/page.tsx           # Stub
│   │   └── waste/page.tsx            # Stub
│   └── auth/                         # Legacy /auth/* URLs (NOT the (auth) group)
│       ├── confirm/route.ts          # OTP callback — MUST stay /auth/confirm
│       ├── error/page.tsx
│       ├── forgot-password/page.tsx
│       ├── update-password/page.tsx
│       └── sign-up-success/page.tsx
├── domains/
│   ├── auth/
│   ├── raw-materials/
│   ├── orders/
│   ├── metrics/
│   └── waste/
│       └── (each: domain/, application/, infrastructure/, presentation/)
├── lib/
│   └── utils.ts                      # cn + hasEnvVars (shadcn @/lib/utils alias)
└── shared/
    ├── infrastructure/
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   ├── server.ts
    │   │   └── proxy.ts
    │   ├── database/
    │   │   └── supabase.types.ts     # Placeholder until gen types
    │   └── providers/
    │       └── QueryProvider.tsx
    └── presentation/
        ├── ui/                       # shadcn primitives
        ├── tutorial/
        ├── auth-button.tsx
        ├── deploy-button.tsx
        ├── env-var-warning.tsx
        ├── hero.tsx
        ├── next-logo.tsx
        ├── supabase-logo.tsx
        └── theme-switcher.tsx

proxy.ts                              # Repo root — unchanged location
```

**Note on `src/lib/utils.ts`:** Architecture diagram omits `src/lib/`, but shadcn and `components.json` expect `@/lib/utils`. With `@/*` → `./src/*`, keeping `src/lib/utils.ts` is the lowest-friction choice. `hasEnvVars` stays co-located with `cn`.

## Complete file move map

Every file in the current scaffold. **Old → New.**

### App routes and assets

| Old path | New path | Notes |
|----------|----------|-------|
| `app/layout.tsx` | `src/app/layout.tsx` | Add QueryProvider wrapper |
| `app/page.tsx` | `src/app/page.tsx` | Update links `/auth/login` → `/login` |
| `app/globals.css` | `src/app/globals.css` | |
| `app/favicon.ico` | `src/app/favicon.ico` | |
| `app/opengraph-image.png` | `src/app/opengraph-image.png` | |
| `app/twitter-image.png` | `src/app/twitter-image.png` | |
| `app/instruments/page.tsx` | `src/app/instruments/page.tsx` | Update supabase import path |
| `app/auth/login/page.tsx` | `src/app/(auth)/login/page.tsx` | URL becomes `/login` |
| `app/auth/sign-up/page.tsx` | `src/app/(auth)/register/page.tsx` | URL becomes `/register` |
| `app/protected/layout.tsx` | `src/app/(app)/layout.tsx` | Update component imports |
| `app/protected/page.tsx` | `src/app/(app)/dashboard/page.tsx` | Update redirect to `/login` |
| `app/auth/confirm/route.ts` | `src/app/auth/confirm/route.ts` | **Keep URL `/auth/confirm`** |
| `app/auth/error/page.tsx` | `src/app/auth/error/page.tsx` | |
| `app/auth/forgot-password/page.tsx` | `src/app/auth/forgot-password/page.tsx` | |
| `app/auth/update-password/page.tsx` | `src/app/auth/update-password/page.tsx` | |
| `app/auth/sign-up-success/page.tsx` | `src/app/auth/sign-up-success/page.tsx` | |

### New route files (no old source)

| New path | Purpose |
|----------|---------|
| `src/app/(app)/inventory/page.tsx` | Minimal Server Component stub |
| `src/app/(app)/orders/page.tsx` | Minimal Server Component stub |
| `src/app/(app)/waste/page.tsx` | Minimal Server Component stub |

Optional redirect-only routes (alternative to `next.config.ts` redirects):

| New path | Purpose |
|----------|---------|
| `src/app/auth/login/page.tsx` | `redirect('/login')` for bookmarks |
| `src/app/auth/sign-up/page.tsx` | `redirect('/register')` |
| `src/app/protected/page.tsx` | `redirect('/dashboard')` |

**Recommendation:** prefer `next.config.ts` redirects (single source) over duplicate route files.

### Lib / infrastructure

| Old path | New path |
|----------|----------|
| `lib/supabase/client.ts` | `src/shared/infrastructure/supabase/client.ts` |
| `lib/supabase/server.ts` | `src/shared/infrastructure/supabase/server.ts` |
| `lib/supabase/proxy.ts` | `src/shared/infrastructure/supabase/proxy.ts` |
| `lib/utils.ts` | `src/lib/utils.ts` |

### Root proxy entry

| Old path | New path | Notes |
|----------|----------|-------|
| `proxy.ts` | `proxy.ts` | Update import: `@/shared/infrastructure/supabase/proxy` |

### Auth presentation (`domains/auth/presentation/components/`)

| Old path | New path |
|----------|----------|
| `components/login-form.tsx` | `src/domains/auth/presentation/components/login-form.tsx` |
| `components/sign-up-form.tsx` | `src/domains/auth/presentation/components/sign-up-form.tsx` |
| `components/forgot-password-form.tsx` | `src/domains/auth/presentation/components/forgot-password-form.tsx` |
| `components/update-password-form.tsx` | `src/domains/auth/presentation/components/update-password-form.tsx` |
| `components/logout-button.tsx` | `src/domains/auth/presentation/components/logout-button.tsx` |

### Shared presentation — UI primitives

| Old path | New path |
|----------|----------|
| `components/ui/badge.tsx` | `src/shared/presentation/ui/badge.tsx` |
| `components/ui/button.tsx` | `src/shared/presentation/ui/button.tsx` |
| `components/ui/card.tsx` | `src/shared/presentation/ui/card.tsx` |
| `components/ui/checkbox.tsx` | `src/shared/presentation/ui/checkbox.tsx` |
| `components/ui/dropdown-menu.tsx` | `src/shared/presentation/ui/dropdown-menu.tsx` |
| `components/ui/input.tsx` | `src/shared/presentation/ui/input.tsx` |
| `components/ui/label.tsx` | `src/shared/presentation/ui/label.tsx` |

### Shared presentation — scaffold / marketing

| Old path | New path |
|----------|----------|
| `components/auth-button.tsx` | `src/shared/presentation/auth-button.tsx` |
| `components/deploy-button.tsx` | `src/shared/presentation/deploy-button.tsx` |
| `components/env-var-warning.tsx` | `src/shared/presentation/env-var-warning.tsx` |
| `components/theme-switcher.tsx` | `src/shared/presentation/theme-switcher.tsx` |
| `components/hero.tsx` | `src/shared/presentation/hero.tsx` |
| `components/next-logo.tsx` | `src/shared/presentation/next-logo.tsx` |
| `components/supabase-logo.tsx` | `src/shared/presentation/supabase-logo.tsx` |

### Shared presentation — tutorial

| Old path | New path |
|----------|----------|
| `components/tutorial/tutorial-step.tsx` | `src/shared/presentation/tutorial/tutorial-step.tsx` |
| `components/tutorial/code-block.tsx` | `src/shared/presentation/tutorial/code-block.tsx` |
| `components/tutorial/connect-supabase-steps.tsx` | `src/shared/presentation/tutorial/connect-supabase-steps.tsx` |
| `components/tutorial/fetch-data-steps.tsx` | `src/shared/presentation/tutorial/fetch-data-steps.tsx` |
| `components/tutorial/sign-up-user-steps.tsx` | `src/shared/presentation/tutorial/sign-up-user-steps.tsx` |

### New infrastructure files

| New path | Purpose |
|----------|---------|
| `src/shared/infrastructure/providers/QueryProvider.tsx` | TanStack Query client provider |
| `src/shared/infrastructure/database/supabase.types.ts` | Placeholder; comment with gen-types command |

## URL mapping table

Route groups `(auth)` and `(app)` do **not** appear in URLs.

| Public URL | Route file | Change from today |
|------------|------------|-------------------|
| `/` | `src/app/page.tsx` | Unchanged |
| `/login` | `src/app/(auth)/login/page.tsx` | Was `/auth/login` |
| `/register` | `src/app/(auth)/register/page.tsx` | Was `/auth/sign-up` |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Was `/protected` |
| `/inventory` | `src/app/(app)/inventory/page.tsx` | **New stub** |
| `/orders` | `src/app/(app)/orders/page.tsx` | **New stub** |
| `/waste` | `src/app/(app)/waste/page.tsx` | **New stub** |
| `/instruments` | `src/app/instruments/page.tsx` | Unchanged (public) |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | **Unchanged** (Supabase OTP) |
| `/auth/error` | `src/app/auth/error/page.tsx` | Unchanged |
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | Unchanged |
| `/auth/update-password` | `src/app/auth/update-password/page.tsx` | Unchanged |
| `/auth/sign-up-success` | `src/app/auth/sign-up-success/page.tsx` | Unchanged |

### Legacy URL redirects (recommended)

| Old URL | New URL | Mechanism |
|---------|---------|-----------|
| `/auth/login` | `/login` | `next.config.ts` `redirects()` |
| `/auth/sign-up` | `/register` | `next.config.ts` `redirects()` |
| `/protected` | `/dashboard` | `next.config.ts` `redirects()` |

Example:

```typescript
// next.config.ts (additive)
async redirects() {
  return [
    { source: "/auth/login", destination: "/login", permanent: false },
    { source: "/auth/sign-up", destination: "/register", permanent: false },
    { source: "/protected", destination: "/dashboard", permanent: false },
  ];
}
```

## Internal link updates

Update hardcoded paths in moved files:

| File(s) | Old path | New path |
|---------|----------|----------|
| `page.tsx` (landing) | `/auth/login` | `/login` |
| `login-form.tsx` | `router.push("/protected")` | `router.push("/dashboard")` |
| `login-form.tsx` | `/auth/sign-up` | `/register` |
| `sign-up-form.tsx` | `emailRedirectTo: .../protected` | `.../dashboard` |
| `sign-up-form.tsx` | `/auth/login` | `/login` |
| `logout-button.tsx` | `/auth/login` | `/login` |
| `auth-button.tsx` | `/auth/login`, `/auth/sign-up` | `/login`, `/register` |
| `dashboard/page.tsx` | `redirect("/auth/login")` | `redirect("/login")` |
| `lib/supabase/proxy.ts` | redirect to `/auth/login` | redirect to `/login` |

Forgot/update-password forms keep `/auth/update-password` and `/auth/login` where they reference Supabase email flows — update login link to `/login` only.

## Proxy / session guard

Root `proxy.ts` stays at repo root (Next.js convention). Logic lives in `src/shared/infrastructure/supabase/proxy.ts`.

### Public path allowlist (unauthenticated OK)

```
/                           # landing
/login                      # (auth) login
/register                   # (auth) register
/auth/*                     # confirm, error, forgot-password, update-password, sign-up-success
/instruments                # smoke test
/instruments/*              # if nested later
```

### Proxy condition (conceptual)

Replace today's check:

```typescript
// Before
!pathname.startsWith("/login") &&
!pathname.startsWith("/auth") &&
pathname !== "/instruments"

// After — also allow /register explicitly (already covered if /login check uses startsWith)
!pathname.startsWith("/login") &&
!pathname.startsWith("/register") &&
!pathname.startsWith("/auth") &&
pathname !== "/instruments" &&
!pathname.startsWith("/instruments/")
```

Redirect target when unauthenticated: **`/login`** (not `/auth/login`).

### `/auth/confirm` exception

This route **must** remain at `/auth/confirm` because:

1. Supabase Auth redirect URLs are configured in the Dashboard to this path.
2. Moving it to `(auth)/confirm` would produce URL `/confirm`, breaking email OTP unless Dashboard is reconfigured.

Keep file at `src/app/auth/confirm/route.ts` (segment `auth`, not route group `(auth)`).

The confirm route may import `EmailOtpType` from `@supabase/supabase-js` in the Route Handler — acceptable at the app/infrastructure boundary; not a presentation-layer violation.

## Config file updates

### tsconfig.json

```json
"paths": {
  "@/*": ["./src/*"]
}
```

### components.json

```json
{
  "tailwind": {
    "css": "src/app/globals.css"
  },
  "aliases": {
    "components": "@/shared/presentation",
    "utils": "@/lib/utils",
    "ui": "@/shared/presentation/ui",
    "lib": "@/lib",
    "hooks": "@/shared/presentation/hooks"
  }
}
```

### tailwind.config.ts

Ensure content globs include `src/**` (already present). Optionally remove stale `./pages/**` if unused; not required for this slice.

## Route group design

### `(auth)` — canonical login/register

- Contains only `/login` and `/register` pages.
- No shared layout required in this slice (pages carry their own marketing panel).
- Pages import forms from `@/domains/auth/presentation/components/*`.

### `(app)` — authenticated shell

- Layout from current `protected/layout.tsx`.
- Proxy guards all `(app)` routes (they are not in the public allowlist).
- `dashboard/page.tsx` retains server-side `createClient()` + `getClaims()` pattern from template — **scaffold debt** until auth domain feature extracts it.

### `auth/` segment (outside groups)

Legacy Supabase and password-recovery URLs that must keep `/auth/` prefix. Coexists with `(auth)` group without conflict (different filesystem paths).

## Placeholder pages

Minimal stubs for `(app)` routes not in scaffold:

```tsx
// src/app/(app)/inventory/page.tsx (example)
export default function InventoryPage() {
  return (
    <div>
      <h1>Inventory</h1>
      <p>Coming soon.</p>
    </div>
  );
}
```

Same pattern for `orders/page.tsx` and `waste/page.tsx`. English UI strings. No Supabase calls.

## Domain skeleton placeholders

For each context (`auth`, `raw-materials`, `orders`, `metrics`, `waste`), create:

```
domains/<context>/
├── domain/
│   ├── entities.ts          # export {} or // placeholder
│   ├── repository.ts        # export type port placeholder
│   └── validations.ts
├── application/
│   └── use-cases.ts
├── infrastructure/
│   ├── supabase-repo.ts
│   └── query-adapters.ts
└── presentation/
    ├── components/
    │   └── .gitkeep
    └── hooks/
        └── .gitkeep
```

`auth/presentation/components/` will contain real moved forms (not empty). Other contexts stay placeholder-only.

**Do not invent fake repository implementations** — stubs export empty objects or commented TODOs pointing to future features.

## QueryProvider decision

**Included in this feature (required, not follow-up).**

Rationale:

- [docs/architecture.md](../../docs/architecture.md) shows `QueryProvider` in root `layout.tsx`.
- Stack mandates TanStack Query v5 for client cache.
- Adding `@tanstack/react-query` is low risk: one dependency, one thin client component.
- Default `QueryClient` with no queries mounted is inert and does not break scaffold.

```tsx
// src/shared/infrastructure/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

Wrap inside `ThemeProvider` in `src/app/layout.tsx`.

Install: `pnpm add @tanstack/react-query`

## Auth flow diagram (unchanged behavior, new paths)

```mermaid
flowchart TD
  A[User visits /login] --> B[LoginForm client]
  B --> C[createClient browser]
  C --> D[signInWithPassword]
  D --> E[router.push /dashboard]
  E --> F[proxy allows authenticated]
  F --> G[dashboard page server getClaims]

  H[Supabase email link] --> I[/auth/confirm GET]
  I --> J[verifyOtp server client]
  J --> K[redirect next or /]
```

## Hexagonal layer notes

| Layer | This feature |
|-------|--------------|
| `src/app/` | View containers; may still use server `createClient()` on dashboard/instruments (template debt) |
| `domains/auth/presentation/` | Moved forms; import `@/shared/infrastructure/supabase/client`, not `@supabase/supabase-js` |
| `domains/*/domain` | Empty placeholders only |
| `shared/infrastructure/supabase/` | SSR clients + proxy helper |
| `shared/infrastructure/providers/` | QueryProvider |

Future auth feature will move sign-in/sign-up orchestration to `application/use-cases.ts` and hide Supabase behind ports.

## Performance budgets

Not applicable — no new UI surfaces with measurable CWV impact. Restructure must not regress:

- **LCP:** landing and login pages should load same as before (no new blocking scripts beyond QueryProvider, ~negligible).
- **CLS:** preserve existing layout structure when moving files; do not change CSS tokens.

If bundle size increases measurably from `@tanstack/react-query`, note in progress journal; acceptable for architecture alignment.

## Import path cheat sheet (after move)

| Usage | Import |
|-------|--------|
| Browser Supabase | `@/shared/infrastructure/supabase/client` |
| Server Supabase | `@/shared/infrastructure/supabase/server` |
| cn helper | `@/lib/utils` |
| shadcn Button | `@/shared/presentation/ui/button` |
| LoginForm | `@/domains/auth/presentation/components/login-form` |
| QueryProvider | `@/shared/infrastructure/providers/QueryProvider` |

## Files explicitly NOT moved

Stay at repo root unchanged (except noted config edits):

- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tailwind.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- `public/`, `supabase/`, `docs/`, `specs/`, `progress/`, harness files
- `proxy.ts` (location fixed; import updated)
