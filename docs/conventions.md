# Conventions — asadero-pro

Coding patterns for humans and agents. Canonical for `implementer` and `reviewer`.

Sources: `.cursorrules`, `.cursor/rules/02-architecture.md`, `.cursor/rules/03-logic-tdd.md`, `.cursor/rules/routing-map.md`.

## Language

- **User communication:** Spanish
- **Code, SQL, comments, commits, specs, docs:** English
- Table names, columns, indexes, constraints: English
- No Spanish identifiers in implementation

## Ignore Reental agent defaults

User-level `spec_author` / `implementer` / `reviewer` files include Reental defaults. **Do not apply them here:**

| Do not use | Use instead |
|------------|-------------|
| `src/pages/`, `getServerSideProps` | `src/app/` App Router |
| next-auth, `AuthMiddleware`, `requireAuth` | Supabase Auth + middleware / server `redirect()` |
| GraphQL `utils/api.ts`, `constants/api` | Domain ports + Supabase repos |
| wagmi, viem, `@reental/contracts-sdk` | No Web3 |
| `public/locales/`, next-i18next | English UI strings until a spec adds i18n |
| Atomic folders `components/{elements,molecules,...}` | `src/domains/<context>/presentation/` |
| `yarn lint` | `pnpm lint` when the app exists |
| `baseUrl` paths `components/`, `hooks/` | `@/` → `src/` (e.g. `@/domains/orders/...`) |
| Notion Kanban V2 | `feature_list.json` + `progress/` |

## Clean Code (TypeScript)

- Meaningful, pronounceable, searchable names. Named constants instead of magic numbers.
- Same vocabulary: `getUser`, not mixed `getClientData` / `getCustomerRecord`.
- Do not repeat type context in property names (`User.email`, not `User.userEmail`).
- Functions do one thing; prefer ≤2 arguments or an options object.
- No boolean flags that fork behavior — split functions.
- Prefer `map` / `filter` / `reduce` over `for` / `while` when they stay readable.
- Encapsulate complex conditionals; write positive checks.
- Rely on TypeScript types; do not add `typeof` / `instanceof` trees for domain branching.

## Immutability

Never mutate state, arrays, or objects in place (React state, React Query cache, domain results).

```typescript
// Bad
cart.push({ item, quantity: 1 });

// Good
return [...cart, { item, quantity: 1 }];
```

Cart merge (increment existing line) must return a new array — see `docs/testing.md`.

## Next.js 15 / React 19

- Server Components by default (layouts, Supabase reads on the server, metadata).
- `'use client'` only for interactive UI, forms, and dashboard controls.
- `cookies()`, `headers()`, and dynamic `params` are async — await them.
- Use `next/image` with dimensions or blur placeholders (CLS).
- Dynamically import heavy charts with `next/dynamic` and a loading fallback.

## TanStack Query v5

- Use React Query for dynamic, cacheable **client** data.
- Keys: `['collection', merchantId, filters]` (e.g. `['raw-materials', merchantId]`, `['orders', merchantId]`).
- Handle `isLoading`, `isError`, and `data` in the UI.
- Mutations use `useMutation`; on success `queryClient.invalidateQueries` for affected keys.
- Query adapters live in `domains/<context>/infrastructure/query-adapters.ts`, not in page files.

## Imports

```typescript
import { createClient } from '@/shared/infrastructure/supabase/client' // infrastructure only
import { useRawMaterials } from '@/domains/raw-materials/infrastructure/query-adapters'
```

Presentation may import query adapters and domain types. It may not import `@supabase/supabase-js`.

## Presentation / UI

[DESIGN.md](../DESIGN.md) (repo root) is the **mandatory visual contract** for presentation work. Implementer and reviewer must follow it for tokens, typography, radius, shadcn/Tailwind mapping, named components (metric tile, waste input row, live order queue), and prohibited antipatterns. **Do not invent a parallel design system.**

Applies to:

- Current scaffold: `app/`, `components/` (Next.js `with-supabase` template)
- Future hexagonal layout: `src/app/`, `src/domains/*/presentation/`, `src/shared/presentation/`
- Global CSS that encodes tokens (`app/globals.css` and other `*.css` that style product UI)

**Scaffold vs DESIGN.md:** the `with-supabase` starter styling may disagree with DESIGN.md (default shadcn palette, shadows, extra accents). **DESIGN.md wins for new UI.** Do not restyle the entire scaffold unless a spec or DESIGN.md itself requires existing pages to comply.

Cursor rule: `.cursor/rules/ui-design.mdc`. ADR: [docs/decisions/002-presentation-follows-design-md.md](decisions/002-presentation-follows-design-md.md).

## Roles (MVP)

`user_role`: `admin` | `grill_master` | `waiter` (see `docs/database-schema.md`). Specs must state which roles can mutate inventory vs orders vs waste.

## Commands (when the Next app exists)

```
Dev:          pnpm dev
Lint:         pnpm lint
Test:         pnpm test
Typecheck:    pnpm exec tsc --noEmit
Supabase:     pnpm dlx supabase start
Migrate:      pnpm dlx supabase migration new <name>
Reset local:  pnpm dlx supabase db reset
Gen types:    pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts
Harness:      node init.mjs
```

Until `package.json` exists, implementer scaffolds the app as a specced feature — do not invent a second folder layout.

## Ask first

- Adding runtime dependencies
- Changing RLS or `get_user_merchant_id()`
- Introducing a new bounded context under `src/domains/`
- Switching package manager
