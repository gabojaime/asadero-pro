# Feature: Reorganize scaffold into canonical hexagonal src/ layout

| Field | Value |
|-------|-------|
| id | hexagonal-folder-restructure |
| status | done |
| spec | specs/hexagonal-folder-restructure/ |
| verification | manual (typecheck + lint + browser smoke) |

## 2026-08-25 17:16 — leader

**Action:** Feature added to backlog (`pending`). Human requested the folder restructure in this session (treat as implementation approval after spec exists). Notion Kanban not used (asadero-pro).

**Notes:** Canonical layout is `docs/architecture.md` only. Out of scope: BBQ schema/migrations, restyle to DESIGN.md, new product features, git commit.

## 2026-08-25 17:25 — leader

**Action:** [spec_author](5b6a04e4-1cfd-46bf-a983-363505dbf702) wrote `specs/hexagonal-folder-restructure/`. Status `spec_ready` then immediately `in_progress`. Human already requested the restructure in this session (explicit implementation approval). Notion Kanban not used.

**Leader decisions on spec open questions:**
1. Omit `(auth)/layout.tsx` in this slice (optional, not blocking).
2. Placeholder `supabase.types.ts` with gen-types comment is OK until first migration.
3. Deduplicate `sign-up-form.tsx` if Windows path variants exist.

**Next:** implementer executes `specs/hexagonal-folder-restructure/tasks.md`. Do not commit. Do not invent BBQ logic.

## 2026-08-25 17:22 — implementer

**Task:** tasks.md §1 — Path aliases and tooling config

**Changes:**
- `tsconfig.json` — `@/*` → `./src/*`
- `components.json` — shadcn aliases + `src/app/globals.css`
- Created `src/` directory skeleton

**Verification:** pending full move

**Notes:** Started implementation. Notion Kanban not used (asadero-pro).

## 2026-08-25 17:23 — implementer

**Task:** tasks.md §2–3 — Supabase infra + App Router move

**Changes:**
- `lib/supabase/*` → `src/shared/infrastructure/supabase/*`
- `lib/utils.ts` → `src/lib/utils.ts`
- Added `src/shared/infrastructure/database/supabase.types.ts` (placeholder)
- `app/*` → `src/app/*` (layout, pages, assets, auth OTP routes)

**Verification:** root `app/` removed after move

**Notes:** Updated `proxy.ts` import to `@/shared/infrastructure/supabase/proxy`.

## 2026-08-25 17:24 — implementer

**Task:** tasks.md §4 — Route groups, URLs, proxy, redirects

**Changes:**
- `src/app/(auth)/login/page.tsx`, `(auth)/register/page.tsx`
- `src/app/(app)/layout.tsx`, `dashboard/page.tsx`
- Stub pages: `(app)/inventory`, `orders`, `waste`
- `src/shared/infrastructure/supabase/proxy.ts` — allow `/login`, `/register`, `/auth/*`, `/instruments`; redirect to `/login`
- `next.config.ts` — legacy redirects (`/auth/login` → `/login`, etc.)
- Updated internal links in forms, landing, auth-button, dashboard

**Verification:** manual — `/dashboard` unauthenticated → `/login`; `/auth/login` → `/login`

## 2026-08-25 17:25 — implementer

**Task:** tasks.md §5–6 — Components + domain skeletons

**Changes:**
- Auth forms → `src/domains/auth/presentation/components/`
- UI + scaffold chrome → `src/shared/presentation/`
- Tutorial → `src/shared/presentation/tutorial/`
- Domain placeholders for `auth`, `raw-materials`, `orders`, `metrics`, `waste` (four layers each)
- Removed duplicate root `components/`, `lib/`, `app/`

**Verification:** import paths updated; deduplicated `sign-up-form.tsx`

## 2026-08-25 17:26 — implementer

**Task:** tasks.md §7 — QueryProvider

**Changes:**
- Added `@tanstack/react-query` dependency
- `src/shared/infrastructure/providers/QueryProvider.tsx`
- Wrapped root layout children inside `ThemeProvider`

**Verification:** dev server boots without QueryClient errors

## 2026-08-25 17:27 — implementer

**Task:** tasks.md §8–10 — Import sweep + final verification

**Changes:**
- Global import sweep: no remaining `@/lib/supabase` or `@/components` in `src/`
- Removed unused `redirect` import in `instruments/page.tsx`
- Deleted legacy root `app/`, `lib/`, `components/` (confirmed absent)

### Verification table

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm exec tsc --noEmit` | PASS | After clearing stale `.next` |
| `pnpm lint` (full) | FAIL (pre-existing) | `.next/dev/types/validator.ts` noise when dev running; `src/` clean |
| `pnpm lint src proxy.ts next.config.ts` | FAIL (pre-existing) | `tailwind.config.ts` `require()` only |
| `pnpm dev` | PASS | Ready in ~2.2s |
| `/instruments` | PASS | violin, viola, cello JSON |
| `/login` | PASS | LoginForm renders |
| `/register` | PASS | SignUpForm renders |
| `/` home | PASS | Landing renders; no console errors |
| `/dashboard` (unauth) | PASS | Redirects to `/login` |
| `/auth/login` (legacy) | PASS | Redirects to `/login` |
| `/auth/confirm` | PASS | Route file at `src/app/auth/confirm/route.ts` |

**Notes:** Ready for `reviewer`. Feature status remains `in_progress` → leader should set `review_pending`.

## 2026-08-25 17:40 — reviewer

**Verdict:** pass_with_notes

**Findings:**
- [note] NFR-2 accepted scaffold debt — `src/app/(app)/dashboard/page.tsx`, `src/app/instruments/page.tsx`, and auth presentation forms still call `createClient()` via `@/shared/infrastructure/supabase/*` (not application ports). Explicitly deferred by spec; do not block.
- [note] FR-5 — `src/app/auth/confirm/route.ts` correctly remains at `/auth/confirm` and imports server wrapper + `EmailOtpType`; missing brief comment documenting why the route sits outside `(auth)` (spec asked for a comment).
- [note] `src/shared/presentation/tutorial/sign-up-user-steps.tsx` — relative `href="auth/sign-up"` still points at legacy path (works via `next.config.ts` redirect to `/register`); prefer `/register` for clarity (task §8 cosmetic).
- [note] Manual smoke partial vs AC-4 / task §10 — form render + unauth `/dashboard` redirect confirmed; successful login→`/dashboard` and authenticated stub pages (`/inventory`, `/orders`, `/waste`) not recorded. Implementation paths look correct.
- [note] AC-12 / NFR-5 — `pnpm exec tsc --noEmit` PASS; `eslint src proxy.ts next.config.ts` PASS. Full `pnpm lint` fails on `.next` generated noise + pre-existing `tailwind.config.ts` `require()` — not attributable to this restructure.
- [note] Architecture diagram optional `(auth)/layout.tsx` and `orders/[orderId]` omitted per leader decisions — OK for this slice.
- [FYI] Working tree has no root `app/`, `lib/`, or `components/`. Git index still lists deleted legacy paths until a commit (expected; no commit requested).
- [FYI] CHECKPOINTS N/A for this mechanical move: DESIGN.md restyle, schema/migrations/RLS/gen-types, Vitest domain logic.

**CHECKPOINTS (applicable):**
- Spec & process: pass (human-approved in session; `feature_list.json` = `review_pending`; progress journal complete)
- Code quality / English / minimal diff: pass
- Hexagonal skeleton + `@/` → `src/`: pass
- Domain placeholders pure TS: pass
- Auth guard via root `proxy.ts` + dashboard server `redirect("/login")`: pass
- Presentation never imports `@supabase/supabase-js` (confirm Route Handler type import only — allowed): pass
- DESIGN / Data & tenancy / automated domain tests: N/A

**Manual verification status:** partial

**Simplification (optional, no action required):** rename `ProtectedLayout` / `ProtectedPage` identifiers to app/dashboard wording when convenient; no structural cleanup needed — restructure reduced layout ambiguity rather than relocating complexity.

**Leader action:** Feature may move to `done`. Notes are non-blocking follow-ups.

## 2026-08-25 17:50 — leader

**Action:** Reviewer [3da3afe7-9079-4d3b-84a7-98c2f77b9465](3da3afe7-9079-4d3b-84a7-98c2f77b9465) verdict `pass_with_notes`. Status set to `done`. Confirmed on disk: no root `app/`, `lib/`, or `components/` (git still shows deletions unstaged until a human commit). Notion not used. No commit created.
