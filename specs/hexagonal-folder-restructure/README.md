# Hexagonal folder restructure

Mechanically migrate the stable Next.js 15 + Supabase `with-supabase` scaffold from the repo root into the canonical hexagonal layout defined in [docs/architecture.md](../../docs/architecture.md).

## Problem

After [nextjs-supabase-scaffold](../nextjs-supabase-scaffold/), application code lives at the repo root (`app/`, `lib/`, `components/`) with `tsconfig.json` path alias `@/*` → `./*`. That layout was intentional for bootstrap but **does not match** the target architecture:

- Routes should live under `src/app/` with `(auth)` and `(app)` route groups.
- Supabase clients should live under `src/shared/infrastructure/supabase/`.
- Domain slices should exist under `src/domains/<context>/` with four layers.
- Shared UI should live under `src/shared/presentation/`.

Continuing product work without this move increases import drift and makes every future feature fight the harness docs.

## Goals

1. Single App Router root at `src/app/` — **no duplicate root `app/`** after the move.
2. Preserve all working scaffold behavior: Supabase SSR cookie clients, root `proxy.ts` session guard, `/instruments` smoke route, email OTP callback at `/auth/confirm`.
3. Align public URLs with architecture: `/login`, `/register`, `/dashboard` (with thin redirects from legacy URLs).
4. Create empty domain layer skeletons for MVP bounded contexts.
5. Update `@/` imports to resolve through `src/`.

## In scope

| Area | Work |
|------|------|
| File moves | Every file listed in [design.md](./design.md) move map |
| Path aliases | `tsconfig.json`, `components.json`, `tailwind.config.ts` content globs |
| Routes | `(auth)` login/register, `(app)` dashboard + placeholder inventory/orders/waste |
| Proxy | Public path allowlist for `/login`, `/register`, `/auth/*`, `/instruments`; redirect unauthenticated users to `/login` |
| Redirects | Optional but **recommended**: `/auth/login` → `/login`, `/auth/sign-up` → `/register`, `/protected` → `/dashboard` |
| Supabase | Move clients to `src/shared/infrastructure/supabase/`; keep root `proxy.ts` importing the proxy helper |
| Components | Auth forms → `domains/auth/presentation/`; UI primitives + tutorial/scaffold chrome → `shared/presentation/` |
| Domain skeletons | Placeholder files for `auth`, `raw-materials`, `orders`, `metrics`, `waste` |
| QueryProvider | Add `@tanstack/react-query` + thin provider in root layout (architecture requirement; see design.md) |
| Import sweep | Replace `@/lib/supabase/*`, `@/components/*` with new paths |
| Cleanup | Delete empty `app/`, `lib/`, `components/` at repo root |

## Out of scope

- BBQ schema, Supabase migrations, RLS policies, or `instruments` table changes
- Inventory, orders, waste, or metrics **business logic**
- Restyling scaffold pages to [DESIGN.md](../../DESIGN.md)
- New product features (sidebar, merchant context, role-based UI)
- Committing `.env.local` or service-role keys
- Editing [DESIGN.md](../../DESIGN.md) content
- Extracting auth into use cases / repository ports (deferred to a future auth feature)
- Vitest domain tests (no domain logic added in this slice)
- `orders/[orderId]` dynamic route (listed in architecture for future orders feature; not required here)

## What stays at repo root

Unchanged harness and tooling paths:

- `DESIGN.md`, `AGENTS.md`, `CHECKPOINTS.md`, `feature_list.json`, `init.mjs`, `LICENSE`
- `docs/`, `specs/`, `progress/`, `.cursor/`, `.agents/`
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- `proxy.ts` (Next.js entry; updates import path only)
- `public/`, `supabase/`
- `.env.local`, `.env.example` (local only; never commit secrets)

## Roles affected

None at runtime. This is structural only. Future role-gated routes (`admin`, `grill_master`, `waiter`) will build on the `(app)` layout created here.

## Verification

**Manual** browser smoke + automated typecheck/lint (see [tasks.md](./tasks.md)). Not Vitest.

## Related docs

- [requirements.md](./requirements.md) — FR/NFR and acceptance criteria
- [design.md](./design.md) — move map, URL table, proxy, placeholders
- [tasks.md](./tasks.md) — ordered implementation checklist

## Harness note

This spec supersedes the layout deferral in [specs/nextjs-supabase-scaffold/design.md](../nextjs-supabase-scaffold/design.md). After approval, the scaffold layout section is historical only; `docs/architecture.md` wins.
