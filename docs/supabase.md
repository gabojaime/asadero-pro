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
