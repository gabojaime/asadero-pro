# Architecture — asadero-pro

Hexagonal architecture (ports and adapters) for the BBQ multi-tenant MVP: **Next.js 15 App Router**, **React 19**, **Supabase (PostgreSQL)**, **TanStack Query v5**.

This document is canonical for agents. It consolidates `.cursor/rules/02-architecture.md` and `.cursor/rules/routing-map.md`.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript, strict English identifiers |
| Database | Supabase PostgreSQL + RLS |
| Client cache | TanStack Query v5 only for dynamic client data |
| Package manager | pnpm |
| Tests | Vitest for pure domain/application logic |

This is **not** Pages Router, next-auth, GraphQL, Apollo, wagmi, or `@reental/*`.

## Golden rule

**Dependencies always point inwards.**

```
Presentation (React) → Application (use cases) → Domain (entities, rules)
                                              ↑
                                    Infrastructure (Supabase, React Query)
```

- **Domain** has zero dependencies on React, Next, Supabase, or TanStack Query.
- **Ports** (repository interfaces) live in domain (or application).
- **Adapters** live in infrastructure (Supabase repos, query hooks) and presentation (views).

## Folder layout

Organize **by business domain** (vertical slices), not by technical type. Application routes live in `src/app/` (not a root-level `app/`, and not `src/modules/`).

```
src/
├── app/                                 # Next.js routing (presentation only)
│   ├── layout.tsx                       # Root: fonts, QueryProvider, global CSS
│   ├── page.tsx                         # Public root: landing / redirect
│   ├── (auth)/                          # Route group: unauthenticated
│   │   ├── layout.tsx
│   │   ├── login/page.tsx               # /login
│   │   └── register/page.tsx            # /register
│   └── (app)/                           # Route group: authenticated
│       ├── layout.tsx                   # Sidebar, header, merchant context
│       ├── dashboard/page.tsx           # /dashboard
│       ├── inventory/page.tsx           # /inventory
│       ├── orders/page.tsx              # /orders
│       ├── orders/[orderId]/page.tsx    # /orders/[orderId]
│       └── waste/page.tsx               # /waste
├── domains/
│   ├── auth/
│   ├── raw-materials/
│   ├── orders/
│   ├── metrics/
│   └── waste/
│       ├── domain/                      # Layer 1 — pure TS
│       │   ├── entities.ts
│       │   ├── repository.ts            # Port
│       │   └── validations.ts
│       ├── application/                 # Layer 2 — use cases
│       │   └── use-cases.ts
│       ├── infrastructure/              # Layer 3 — adapters
│       │   ├── supabase-repo.ts
│       │   └── query-adapters.ts
│       └── presentation/                # Layer 4 — views used by app routes
│           ├── components/
│           └── hooks/
└── shared/
    ├── infrastructure/
    │   ├── database/supabase.types.ts   # Generated from CLI
    │   └── providers/QueryProvider.tsx
    └── presentation/                    # Sidebar, Header, shared UI
```

Bounded contexts expected for the MVP: `auth`, `raw-materials`, `orders`, `metrics`, `waste`.

## Four layers

### 1. Domain (blueprint)

Pure TypeScript entities, value objects, and business math (recipe deductions, waste cost, stock checks).

**Prohibited imports:** `@supabase/supabase-js`, `@tanstack/react-query`, `react`, `next/*`.

### 2. Application (instructions)

Use cases orchestrate: fetch from a repository port → validate with domain → persist through the port. Depend on interfaces, never on `createClient()`.

### 3. Infrastructure (tools)

Implements repository ports with Supabase. Owns TanStack Query keys, `useQuery` / `useMutation` wrappers, and cache invalidation.

Query keys follow `['collection', merchantId, filters]` (see `docs/conventions.md`).

### 4. Presentation (builders)

React components and page-level views. Subscribe to query adapters. Handle UI state (modals, inputs, charts) and loading/error.

## Routing rules

From `.cursor/rules/routing-map.md`, applied under `src/app/`:

1. Pages under `src/app/` are **view containers**. They compose domain presentation components and hooks. They must not call Supabase or mutate records directly.
2. Public auth routes stay in `(auth)`; protected routes stay in `(app)` so layouts and guards inherit correctly.
3. Add adjacent `loading.tsx` and `error.tsx` for resource-heavy segments (`dashboard`, `orders`).
4. Folder names, route segments, and files are English.

### Auth boundary

The `(app)` group is protected by **Next.js middleware** and/or a **Server Component** that `redirect()`s to `/login`. A client-side session check in `(app)/layout.tsx` may improve UX but is **not** the security boundary.

## Data flow

```
src/app/(app)/inventory/page.tsx
  → domains/raw-materials/presentation (view)
    → infrastructure/query-adapters.ts (useQuery / useMutation)
      → application/use-cases.ts
        → domain/validations.ts
        → infrastructure/supabase-repo.ts (port implementation)
          → Supabase Postgres (RLS)
```

## Agent constraints

1. **Never mix layers.** Adding a field: `domain/entities.ts` → mapping in `infrastructure/supabase-repo.ts` → UI in `presentation/` / `src/app/`.
2. **No direct Supabase in UI.** `presentation/` and `src/app/` must not import `@supabase/supabase-js`.
3. **English only** in code, SQL, and comments.
4. **Testability first.** Unit tests target `domain/` (and pure application helpers) without mocking Next, DB pools, or UI.

## Schema vs domain templates

`.cursor/rules/02-architecture.md` includes example fields such as `safetyStockKg` and a `stock_transactions_log` table. Those are **illustrative**. The MVP schema in `docs/database-schema.md` is the source of truth (`stock_kg`, `waste_logs`, no safety-stock column until a spec adds it).

Map database columns with `snake_case` to domain fields with `camelCase` (`stock_kg` → `stockKg`, `merchant_id` → `merchantId`).
