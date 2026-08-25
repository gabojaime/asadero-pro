# Tasks — Hexagonal folder restructure

Ordered checklist. Each task should fit one implementer session. Verification: **manual** browser smoke + typecheck/lint unless noted.

---

## 1. Path aliases and tooling config

- [ ] Update `tsconfig.json`: `"@/*": ["./src/*"]`
- [ ] Update `components.json`: aliases (`ui`, `components`, `utils`, `lib`) and `tailwind.css` → `src/app/globals.css`
- [ ] Confirm `tailwind.config.ts` content includes `./src/**/*.{js,ts,jsx,tsx,mdx}` (already present; verify after move)
- [ ] Create `src/` directory skeleton if missing

**Verify:** `pnpm exec tsc --noEmit` may fail until files move — expected.

---

## 2. Move Supabase infrastructure

- [ ] Create `src/shared/infrastructure/supabase/`
- [ ] Move `lib/supabase/client.ts` → `src/shared/infrastructure/supabase/client.ts`
- [ ] Move `lib/supabase/server.ts` → `src/shared/infrastructure/supabase/server.ts`
- [ ] Move `lib/supabase/proxy.ts` → `src/shared/infrastructure/supabase/proxy.ts`
- [ ] Fix relative import in `proxy.ts` (`hasEnvVars` from `@/lib/utils`)
- [ ] Update root `proxy.ts` import to `@/shared/infrastructure/supabase/proxy`
- [ ] Move `lib/utils.ts` → `src/lib/utils.ts`
- [ ] Add placeholder `src/shared/infrastructure/database/supabase.types.ts` with gen-types comment

**Verify:** typecheck on moved infra files only.

---

## 3. Move App Router to `src/app/`

- [ ] Move `app/layout.tsx`, `app/page.tsx`, `app/globals.css` → `src/app/`
- [ ] Move static assets: `favicon.ico`, `opengraph-image.png`, `twitter-image.png` → `src/app/`
- [ ] Move `app/instruments/page.tsx` → `src/app/instruments/page.tsx`
- [ ] Move auth OTP and legacy auth pages to `src/app/auth/` (confirm, error, forgot-password, update-password, sign-up-success)
- [ ] **Do not** leave any files under root `app/`

**Verify:** root `app/` directory empty or deleted.

---

## 4. Route groups, URL changes, proxy, redirects

- [ ] Create `src/app/(auth)/login/page.tsx` from former `app/auth/login/page.tsx`
- [ ] Create `src/app/(auth)/register/page.tsx` from former `app/auth/sign-up/page.tsx`
- [ ] Create `src/app/(app)/layout.tsx` from `app/protected/layout.tsx`
- [ ] Create `src/app/(app)/dashboard/page.tsx` from `app/protected/page.tsx`
- [ ] Create stub pages: `(app)/inventory`, `(app)/orders`, `(app)/waste` (“Coming soon”)
- [ ] Update `src/shared/infrastructure/supabase/proxy.ts`:
  - [ ] Allow `/login`, `/register`, `/auth/*`, `/instruments`
  - [ ] Redirect unauthenticated to `/login`
- [ ] Add `redirects()` in `next.config.ts`: `/auth/login` → `/login`, `/auth/sign-up` → `/register`, `/protected` → `/dashboard`
- [ ] Update internal links (forms, landing, auth-button, dashboard redirect) to canonical URLs

**Verify (manual):** unauthenticated `/dashboard` → `/login`; `/auth/login` → `/login`; `/instruments` public.

---

## 5. Move components

- [ ] Move auth forms + logout-button → `src/domains/auth/presentation/components/`
- [ ] Move `components/ui/*` → `src/shared/presentation/ui/`
- [ ] Move scaffold chrome (auth-button, theme-switcher, deploy-button, env-var-warning, logos, hero) → `src/shared/presentation/`
- [ ] Move `components/tutorial/*` → `src/shared/presentation/tutorial/`
- [ ] Deduplicate duplicate `sign-up-form.tsx` if both path variants exist
- [ ] Update imports inside moved components (`@/lib/utils` → still valid; `@/components/ui/*` → `@/shared/presentation/ui/*`; supabase → `@/shared/infrastructure/supabase/client`)

**Verify:** typecheck passes for component imports.

---

## 6. Domain skeletons

- [ ] For each context (`auth`, `raw-materials`, `orders`, `metrics`, `waste`), create four layers with placeholder files per [design.md](./design.md)
- [ ] `auth/presentation/components/` contains real moved forms (not `.gitkeep`)
- [ ] Other contexts: placeholder exports only — no fake Supabase repos

**Verify:** file tree matches architecture bounded contexts list.

---

## 7. QueryProvider

- [ ] Run `pnpm add @tanstack/react-query`
- [ ] Create `src/shared/infrastructure/providers/QueryProvider.tsx` (client component)
- [ ] Wrap children in `src/app/layout.tsx` with `QueryProvider` inside `ThemeProvider`

**Verify (manual):** dev server starts; no QueryClient runtime errors on `/` and `/login`.

---

## 8. Global import sweep

- [ ] Grep for `@/lib/supabase`, `@/components/`, old `/auth/login`, `/auth/sign-up`, `/protected` strings
- [ ] Update `(auth)` and `(app)` page imports to domain/shared paths
- [ ] Update tutorial code samples in `fetch-data-steps.tsx` string literals to new paths (cosmetic but avoids confusion)
- [ ] Fix any broken relative imports introduced by moves

**Verify:** `pnpm exec tsc --noEmit` passes.

---

## 9. Delete legacy empty folders

- [ ] Remove root `app/` (must be gone)
- [ ] Remove root `lib/`
- [ ] Remove root `components/`
- [ ] Confirm no orphaned duplicate files at repo root

**Verify:** file tree inspection — only `src/app/` exists for App Router.

---

## 10. Final verification

- [ ] `pnpm exec tsc --noEmit` — zero errors
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm dev` — app boots
- [ ] **Manual browser smoke:**
  - [ ] `/` — landing renders
  - [ ] `/login` — form renders; login redirects to `/dashboard` when creds valid
  - [ ] `/register` — form renders
  - [ ] `/instruments` — public, loads (or shows expected Supabase error if table missing)
  - [ ] `/dashboard` — requires auth
  - [ ] `/auth/confirm` — route exists (smoke via file presence; full OTP needs email)
  - [ ] `/inventory`, `/orders`, `/waste` — stubs render inside `(app)` layout when authenticated
- [ ] Record results in `progress/hexagonal-folder-restructure.md`

**Verification type:** manual + typecheck/lint (not Vitest).

---

## Task dependency graph

```
1 (aliases) → 2 (supabase) → 3 (app move) → 4 (routes/proxy)
                    ↓
              5 (components) → 8 (import sweep)
                    ↓
              6 (domains) ────────────────┘
                    ↓
              7 (QueryProvider) → 8
                    ↓
              9 (cleanup) → 10 (verify)
```

Tasks 5 and 6 can partially parallelize after task 3; task 8 must run after all moves.
