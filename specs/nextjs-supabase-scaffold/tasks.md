# Tasks — Next.js 15 + Supabase project bootstrap

Ordered checklist. Each task is sized for one implementer session. Verification: **manual** unless noted.

## 0. Preconditions

- [ ] Read official quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- [ ] Confirm harness-only repo state (no existing `package.json` / `app/`)
- [ ] Record start entry in `progress/nextjs-supabase-scaffold.md`

## 1. Preserve harness (FR-1)

- [ ] Identify protected paths: `AGENTS.md`, `CHECKPOINTS.md`, `feature_list.json`, `init.mjs`, `LICENSE`, `docs/`, `specs/`, `progress/`, `.cursor/`
- [ ] Before any copy/delete, snapshot `git status` for reference
- [ ] **Verify (manual):** After all tasks, run `node init.mjs` — must pass required-file checks

## 2. Scaffold with-supabase into existing repo (FR-2)

- [ ] Run `npx create-next-app@latest . -e with-supabase` from repo root
- [ ] If non-empty directory error: scaffold to temp folder, copy files in, skip harness paths
- [ ] Merge `.gitignore` — retain `.env*.local` and `.env` ignores
- [ ] Do not remove or overwrite harness files from task 1
- [ ] **Verify (manual):** `app/`, `lib/supabase/`, and `package.json` exist at repo root

## 3. Package manager decision (NFR-1)

- [ ] Prefer `pnpm install` after scaffold
- [ ] If template ships `package-lock.json`, choose pnpm (`pnpm-lock.yaml`) or npm — document choice in progress journal
- [ ] Ensure `dev` script runs (`pnpm dev` or `npm run dev`)

## 4. Supabase project + SQL (FR-3)

- [ ] Create Supabase cloud project (Dashboard / database.new) **or** document human-help stop if blocked
- [ ] Run official `instruments` table SQL + RLS policy in SQL Editor
- [ ] Confirm Data API exposes `public.instruments` (Integrations > Data API if needed)
- [ ] **Fallback:** If cloud blocked, `pnpm dlx supabase init && pnpm dlx supabase start` per `docs/supabase.md`; run same SQL locally
- [ ] **Human-help stop:** If no project and no local Docker, pause and request keys/org access — do not fake credentials
- [ ] **Verify (manual):** Three rows (`violin`, `viola`, `cello`) visible in Studio or SQL query

## 5. Environment variables (FR-4)

- [ ] Copy/rename `.env.example` → `.env.local` (never commit)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Connect panel (verify names against live template/docs)
- [ ] **Verify (manual):** `.env.local` listed in `.gitignore`; `git status` does not show `.env.local`

## 6. Instruments page + proxy (FR-5)

- [ ] Create `app/instruments/page.tsx` using `createClient()` from `@/lib/supabase/server` (official quickstart code)
- [ ] Update `lib/supabase/proxy.ts` to exempt `/instruments` from auth redirect
- [ ] **Verify (manual):** File paths match template `@/` alias in `tsconfig.json`

## 7. Optional — Supabase Agent Skills (FR-7)

- [ ] _(Optional)_ Run `npx skills add supabase/agent-skills` at project root
- [ ] Record installed/skipped in progress journal

## 8. L1 verification — dev server smoke (FR-6, AC-5)

- [ ] Run `pnpm dev` (or documented npm equivalent)
- [ ] Open http://localhost:3000/instruments in browser
- [ ] Confirm JSON output with three instruments (not login redirect)
- [ ] If error, capture message in progress journal and resolve env/SQL issues
- [ ] Append verification table to `progress/nextjs-supabase-scaffold.md`:

```markdown
### Verification

| Criterion | Level | Result |
|-----------|-------|--------|
| AC-1 Harness intact | L2 | pass / fail |
| AC-2 Template layout | L2 | pass / fail |
| AC-3 Instruments data | L2 | pass / fail |
| AC-4 Env configured | L2 | pass / fail |
| AC-5 /instruments smoke | L1 | pass / fail |
| AC-6 No secrets committed | L2 | pass / fail |
```

## 9. Handoff to reviewer

- [ ] Confirm no secrets in staged files
- [ ] Note package manager and cloud vs local Supabase choice in progress journal
- [ ] Set feature status to `review_pending` (leader/implementer workflow)
- [ ] Reviewer uses README "Reviewer guidance" — hexagonal CHECKPOINTS items are N/A for this slice
