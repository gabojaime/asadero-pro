# Supabase Setup and Local AI Agent Development Harness

This document establishes the specifications, workflows, and standards for managing the Supabase PostgreSQL database locally and integrating AI Agent Skills/MCP tools within the Cursor environment. 

To optimize token consumption and maximize LLM code generation accuracy, **all migration SQL, TypeScript interfaces, code comments, and terminal scripts must be strictly written in English.**

---

## 1. Local Development Setup with Docker

We use the official **Supabase CLI** for local database emulation. This eliminates remote database connection latency, enables offline development, and provides isolated testing environments.

### Prerequisite Checklist
- **Docker Desktop** installed and running on your system.
- Node.js (v18.17+ or v20+) and a package manager (pnpm/npm).

### Initialization Workflow
Execute these commands in the root of your project:

```bash
# Initialize Supabase configuration in the project
pnpm dlx supabase init

# Start the local Docker container emulation
pnpm dlx supabase start
```

Upon a successful startup, the CLI will output your local service URLs and keys:
- **Studio URL:** `http://localhost:54321` (Local database dashboard)
- **Database URL:** `postgresql://postgres:postgres@localhost:54322/postgres`
- **Anon Key & Service Role Key** (for local development variables)

---

## 2. Migration-Driven Schema Evolution

AI agents must **never** make direct schema changes via the local/production Supabase Studio UI. All database schema evolutions must be explicitly defined in version-controlled migration files.

### Workflow for Database Schema Changes

1. **Create a New Migration File**
   When an agent needs to add a table or modify schemas, it must run:
   ```bash
   pnpm dlx supabase migration new add_orders_and_inventories
   ```
   This creates a file under `supabase/migrations/<timestamp>_add_orders_and_inventories.sql`.

2. **Define SQL Schema (Strictly in English)**
   Write clean, declarative DDL with proper constraints, foreign keys, and indexes inside the generated SQL file:
   ```sql
   -- Create merchants table for multi-tenancy
   CREATE TABLE public.merchants (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   -- Enable Row Level Security (RLS)
   ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

   -- Policy for multi-tenant isolation
   CREATE POLICY "Users can view their own merchant"
   ON public.merchants
   FOR SELECT
   TO authenticated
   USING (auth.uid() = id);
   ```

3. **Apply the Migration Locally**
   Run the following command to apply pending migrations to the local PostgreSQL docker instance:
   ```bash
   pnpm dlx supabase db reset
   ```

---

## 3. Automated TypeScript Type Generation

To keep the frontend database adapters type-safe and ensure compilation errors occur during development rather than production, we automatically generate TypeScript types from our PostgreSQL schema.

### Code Generation Workflow
Whenever migrations are modified and applied to the database, run:

```bash
pnpm dlx supabase gen types typescript --local > src/infrastructure/database/supabase.types.ts
```

### Type Integration in Code
The generated types must be fed into the Supabase client wrapper to provide end-to-end type safety:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';

// Establish a type-safe database client
export const createTypedSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

---

## 4. Harnessing AI Tools: Agent Skills & MCP

To drastically improve the output quality of Cursor, Claude Code, and other LLM assistants, you must load procedural and declarative Supabase contexts directly into the AI context window.

### Installing Supabase Agent Skills
Agent Skills is a curated package of instructions detailing Supabase authentication, server-side rendering patterns, and database migrations. Run this command in the project root to append these skills:

```bash
npx skills add supabase/agent-skills
```

### Integrating Supabase Model Context Protocol (MCP) Server
The **Supabase MCP Server** connects AI assistants directly to your Supabase project. This allows Cursor Composer or Claude Code to:
1. Inspect live PostgreSQL database schemas.
2. Troubleshoot RLS policy failures based on current database state.
3. Automatically generate accurate migration files without manual copy-pasting.

To configure your cursor settings (`project.json` or global MCP settings), ensure the following server connection is active:

```json
{
  "mcpServers": {
    "supabase": {
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

---

## 5. Deployment Checklist
Before building your production bundle or deploying to the cloud:
1. **RLS Audit:** Double-check that all tables have `ROW LEVEL SECURITY` enabled.
2. **Environment Isolation:** Ensure `.env.local` contains local variables and that production credentials are set exclusively as environment variables on your deployment platform (e.g., Vercel).
3. **Custom Domains:** Configure custom domain names for user authentication to prevent cross-site cookie restrictions.
