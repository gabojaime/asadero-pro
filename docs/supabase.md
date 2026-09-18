# Supabase — asadero-pro

Local PostgreSQL via Supabase CLI, migrations, generated types, and MCP. Source: `.cursor/rules/05-supabase.md`.

All migration SQL, TypeScript interfaces, comments, and scripts are English.

## Local setup

Prerequisites: Docker Desktop, Node.js 18.17+ or 20+, **pnpm**.

```bash
pnpm dlx supabase init
pnpm dlx supabase start
```

Typical local output:

- Studio: `http://localhost:54321` (confirm actual CLI output)
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`
- Anon and service-role keys for `.env.local` only

Never commit `.env`, `.env.local`, or service-role keys.

## Migrations

Agents **must not** change schema only in Studio. Every evolution is a versioned migration:

```bash
pnpm dlx supabase migration new add_orders_and_inventories
```

Write DDL in `supabase/migrations/<timestamp>_<name>.sql` following `docs/database-schema.md`.

Apply locally:

```bash
pnpm dlx supabase db reset
```

## Local dev seed (catalog data)

Raw materials (18 floor insumos) and the example asadero menu catalog are **local/dev only** — not inserted by production migrations or `create_merchant_and_admin_profile`.

Files:

- `supabase/seeds/dev_raw_materials.sql` — idempotent INSERT per merchant into `raw_materials_inventory`
- `supabase/seeds/order_menu_catalog.sql` — idempotent `CROSS JOIN merchants` INSERT into `menu_items`
- `[db.seed].sql_paths` in `supabase/config.toml` — ordered list applied **only during** `db reset` (no psql `\i`; CLI batch sender does not support meta-commands)

There is **no** `supabase db seed` subcommand (Supabase CLI 2.x). Seeds from `config.toml` run automatically after migrations when you `db reset`. To re-apply catalog data **after** merchants exist (without wiping the DB), use `db query`:

```bash
pnpm dlx supabase db query --local -f supabase/seeds/dev_raw_materials.sql
pnpm dlx supabase db query --local -f supabase/seeds/order_menu_catalog.sql
```

Or run both via the package script:

```bash
pnpm db:seed
```

Both SQL files are idempotent — safe to re-run; they attach rows to every existing `merchants` row.

**QA workflow:**

1. `pnpm dlx supabase db reset` (migrations + seed; seed is a no-op if no `merchants` row yet)
2. Complete merchant onboarding in the app (creates `merchants` + admin `users`)
3. Re-apply catalog seeds (step 1 wipes data, so skip if you just reset): `pnpm db:seed` or the two `db query` commands above

Production onboarding must **not** auto-insert this catalog unless a future spec adds a template feature. Admins with an empty inventory can load the same 18-item starter catalog from **Inventario** (`/inventory`) via **Cargar insumos iniciales**.

`orders` is added to the `supabase_realtime` publication in migration `20260912160000_order_kitchen_queue.sql` for kitchen queue updates.

## Generated types

After migrations apply:

```bash
pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts
```

Wire the client with `Database` from that file. The client factory lives in shared infrastructure (e.g. `src/shared/infrastructure/supabase/client.ts`), **not** in presentation.

## MCP

Project `.cursor/mcp.json` currently points at the hosted Supabase MCP (`https://mcp.supabase.com/mcp?...`). Prefer that for remote project docs/account when authenticated.

For **local** Docker, a stdio MCP can be added later:

```json
{
  "mcpServers": {
    "supabase-local": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "http://localhost:54321",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_LOCAL_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

Do not put real keys in git. The example in `.cursor/rules/05-supabase.md` that used `auth.uid() = id` on `merchants` is **incorrect**; use `get_user_merchant_id()` (`docs/database-schema.md`).

## Deploy checklist

1. RLS enabled on every operational table
2. Production secrets only on the host (Vercel or equivalent)
3. Auth URL / site URL configured for the deployed origin
