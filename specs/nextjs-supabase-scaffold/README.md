# Next.js 15 + Supabase project bootstrap

## Problem

The repository currently contains only the agent harness (`AGENTS.md`, `docs/`, `specs/`, `progress/`, `.cursor/`, etc.) — no Next.js application, no Supabase client, and no `package.json`. Before building the BBQ multi-tenant MVP, we need a working Next.js 15 app connected to Supabase using the **official** `with-supabase` template patterns so cookie-based SSR auth and server clients behave as documented.

## Goals

1. Scaffold the official Supabase + Next.js quickstart into this **existing non-empty** repository without deleting harness files.
2. Create a Supabase project (cloud preferred) and run the quickstart `instruments` table SQL.
3. Configure local environment variables (never committed) and verify the smoke path at `http://localhost:3000/instruments`.
4. Preserve the agent harness so subsequent features can adopt hexagonal architecture incrementally.

## In scope

- Official `with-supabase` folder layout: root `app/`, `lib/supabase/`, middleware/proxy as shipped by the template.
- Supabase cloud project creation (or documented local Docker fallback).
- Quickstart `instruments` table + RLS policy (public read for anon).
- `app/instruments/page.tsx` using `createClient()` from `@/lib/supabase/server`.
- Update `lib/supabase/proxy.ts` to allow unauthenticated access to `/instruments` (per official docs).
- Environment setup: `.env.example` → `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Package manager decision (prefer **pnpm**; document if npm is used).
- Optional: `npx skills add supabase/agent-skills` at project root.

## Out of scope

- Hexagonal `src/domains/*` structure (`docs/architecture.md` target layout).
- Moving routes to `src/app/(auth)/` or `src/app/(app)/`.
- BBQ schema from `docs/database-schema.md` (merchants, raw materials, orders, RLS with `get_user_merchant_id()`).
- TanStack Query, domain entities, repository ports, or generated types under `src/shared/infrastructure/database/supabase.types.ts`.
- Auth flows beyond what the template ships (login/register wiring for BBQ roles).
- Vitest tests (verification is **manual** for this feature).
- Production deployment, CI pipeline, or migration of harness docs to match app structure.

## Roles affected

None for MVP product roles (`admin`, `grill_master`, `waiter`). This slice is infrastructure-only; no authenticated BBQ workflows.

## Architecture note (critical)

`docs/architecture.md` describes the **target** hexagonal layout (`src/app/` + `src/domains/`). For **this feature only**, the official Supabase template layout wins:

```
app/                  # Next.js routes (not src/app/)
lib/supabase/         # SSR/browser clients + proxy
```

A future feature will migrate or reconcile toward hexagonal architecture. The `instruments` table is a **quickstart smoke-test** — it is not BBQ inventory.

## Reviewer guidance (CHECKPOINTS.md)

Treat the following `CHECKPOINTS.md` items as **N/A** for this slice:

- Domain purity, application ports, infrastructure repositories
- `src/app/` view containers, no Supabase in presentation
- BBQ schema, `merchant_id` RLS, generated types under `src/shared`
- Vitest coverage

Instead verify:

- Official template layout present and functional
- Harness files preserved (see requirements FR-1)
- No secrets committed
- L1 smoke: dev server + `/instruments` displays sample rows

## References

- [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Agent Skills section (optional)](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs#agent-skills)
- Repo: `docs/supabase.md`, `docs/architecture.md`, `CHECKPOINTS.md`

## Spec files

| File | Contents |
|------|----------|
| [requirements.md](./requirements.md) | Functional and non-functional requirements, acceptance criteria |
| [design.md](./design.md) | Folder layout, env vars, SQL, page flow, performance notes |
| [tasks.md](./tasks.md) | Ordered implementation checklist |
