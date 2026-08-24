# Requirements — Next.js 15 + Supabase project bootstrap

Verification type for this feature: **manual** (no Vitest).

## Functional requirements

### FR-1 — Preserve harness files

The implementer **must not delete or overwrite** these paths when scaffolding:

- `AGENTS.md`
- `CHECKPOINTS.md`
- `feature_list.json`
- `init.mjs`
- `LICENSE`
- `docs/` (entire tree)
- `specs/` (entire tree)
- `progress/` (entire tree)
- `.cursor/` (entire tree, including `mcp.json`)
- Existing `.gitignore` entries for env files (merge template ignores if needed; do not remove `.env*.local` / `.env` ignores)

**Acceptance:** After scaffold, `node init.mjs` still passes required-file checks. Git history shows harness files unchanged or merged (not removed).

### FR-2 — Scaffold official with-supabase template

Apply the official Next.js + Supabase template into the **current repository root**:

```bash
npx create-next-app@latest . -e with-supabase
```

If `create-next-app` refuses a non-empty directory:

1. Scaffold into a temporary directory with the same command (without `.`).
2. Copy template files into the repo root, **skipping** harness paths from FR-1.
3. Merge `.gitignore` rather than replacing the repo file wholesale.

**Acceptance:** Root contains `app/`, `lib/supabase/`, `package.json`, Next.js config, and Tailwind setup consistent with the current `with-supabase` example.

### FR-3 — Supabase project and instruments table

Create a Supabase project (prefer [database.new](https://database.new) / Dashboard) and execute the official quickstart SQL:

```sql
create table instruments (
  id bigint primary key generated always as identity,
  name text not null
);

insert into instruments (name)
values
  ('violin'),
  ('viola'),
  ('cello');

grant select on public.instruments to anon;

alter table instruments enable row level security;

create policy "public can read instruments"
on public.instruments
for select to anon
using (true);
```

**Acceptance:** Supabase SQL Editor (or CLI) shows three rows in `public.instruments`. Data API exposes the table (enable **Integrations > Data API** if disabled during project setup).

**Fallback:** If cloud project creation or API keys are blocked (org access, billing, MCP auth), implementer may use local Supabase per `docs/supabase.md` and must document the choice in `progress/nextjs-supabase-scaffold.md`.

**Human-help stop:** If neither cloud nor local Supabase can be provisioned after reasonable attempts, stop and request human assistance for project creation or API keys. Do not commit placeholder secrets.

### FR-4 — Environment variables

1. Rename or copy `.env.example` to `.env.local` (do not commit `.env.local`).
2. Set values from the Supabase project **Connect** panel (Next.js framework tab):

```text
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Use the **current official variable names** from the quickstart docs. If the template ships different placeholder names in `.env.example`, align `.env.local` with whatever the template and docs specify at implementation time.

**Acceptance:** `.env.local` exists locally, is gitignored, and is absent from `git status` / commits. App can initialize Supabase clients without runtime "missing env" errors.

### FR-5 — Public instruments route

1. Create `app/instruments/page.tsx` per the official quickstart (Server Component, `createClient()` from `@/lib/supabase/server`, `Suspense` wrapper, JSON render of rows).
2. Update `lib/supabase/proxy.ts` so unauthenticated users can access `/instruments` (add pathname exception as documented in the quickstart).

**Acceptance:** Visiting `http://localhost:3000/instruments` while logged out shows a JSON array including `violin`, `viola`, and `cello`. No redirect to `/login` for this path.

### FR-6 — Development server smoke test

Run the dev server and confirm the instruments page loads:

```bash
# pnpm preferred; npm if documented in progress journal
pnpm dev   # or npm run dev
```

**Acceptance (L1 manual):** Browser at `http://localhost:3000/instruments` displays instrument data or a clear loading state followed by data. Errors are documented in the progress journal if environment is incomplete.

### FR-7 — Optional Supabase Agent Skills

Optionally install Supabase Agent Skills at repo root:

```bash
npx skills add supabase/agent-skills
```

**Acceptance:** If run, note installation outcome in progress journal. If skipped, no blocking failure.

## Non-functional requirements

### NFR-1 — Package manager

Prefer **pnpm** (`pnpm install`, `pnpm dev`) as stated in `docs/architecture.md`. If the template or `create-next-app` flow hard-requires npm for the initial scaffold, the implementer may use npm for generation only, then record the chosen lockfile and commands in the progress journal.

### NFR-2 — No secrets in git

Never commit `.env`, `.env.local`, service-role keys, or real Supabase credentials. `.env.example` contains placeholders only.

### NFR-3 — English code

All new application code, comments, and SQL remain in English (`.cursorrules`, `docs/conventions.md`).

### NFR-4 — Minimal diff

Do not refactor harness documentation or unrelated files. Do not introduce a second parallel folder layout (e.g. both root `app/` and `src/app/` for this slice).

### NFR-5 — Official docs over training data

Implementer must follow the live quickstart at implementation time. If the template differs from this spec (file names, proxy vs middleware), the official docs win — document deviations in the progress journal.

## Acceptance criteria summary (L2 manual)

| ID | Criterion | Verify |
|----|-----------|--------|
| AC-1 | Harness files intact | `node init.mjs` passes |
| AC-2 | Template layout present | `app/`, `lib/supabase/` exist |
| AC-3 | Supabase instruments data | 3 rows in DB |
| AC-4 | Env configured locally | App starts without env errors |
| AC-5 | `/instruments` public smoke | Browser shows JSON data |
| AC-6 | No secrets committed | `git status` clean of `.env.local` |
| AC-7 | Progress journal updated | Verification table in `progress/nextjs-supabase-scaffold.md` |

## Open questions for human approval

1. **Supabase org/project:** Will the human create the cloud project, or should the implementer use Supabase MCP / Dashboard access already configured in `.cursor/mcp.json`?
2. **Package manager lock-in:** Confirm pnpm is acceptable even if the template defaults to npm lockfiles — implementer will normalize to one lockfile.
3. **Agent Skills:** Install `supabase/agent-skills` in this slice or defer to a later harness task?
