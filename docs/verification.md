# Verification — asadero-pro

How we know a feature is done. Complements `CHECKPOINTS.md` and `docs/testing.md`.

## Defaults

| Surface | Default |
|---------|---------|
| `domains/*/domain` and pure application helpers | **Automated** — Vitest, AAA (`docs/testing.md`) |
| UI, routing, charts | **Manual** — browser, levels below |
| Supabase RLS / auth | **Manual** (local Studio or two-user smoke) unless a spec adds tests |

Leader asks testing preference on the first feature of a session. Store the choice on the feature:

```json
"verification": "manual"
```

or `"automated"` when the feature is primarily domain logic / TDD.

## Manual levels

### L1 — Implementer smoke

Exercise the happy path in the browser (or document why the app is not runnable yet). Record steps in `progress/<feature>.md`.

### L2 — Acceptance criteria

Walk each acceptance criterion in `specs/<feature>/requirements.md`. Mark done or deferred with reason.

### L3 — Regression

Hit sibling routes that share state (`/dashboard`, `/inventory`, `/orders`, `/waste`) when the change touches shared query keys, auth, or merchant context.

### L4 — Tenancy (when data is involved)

Confirm a user from merchant A cannot read or mutate merchant B data (RLS).

## Automated

When `verification` is `automated` or the slice lives in `domain/`:

1. Write a failing Vitest example first (`docs/testing.md`)
2. Implement until it passes
3. Record `pnpm test` (or equivalent) in the progress journal

Do not add Jest if Vitest is already chosen. Do not stand up Cypress/Playwright unless a spec asks for it.

## Progress journal table

Before `review_pending`, implementer appends:

```markdown
### Verification

| Criterion | Level | Result |
|-----------|-------|--------|
| FR-1 …    | L2    | pass / fail / deferred |
```

## Browser

Use Chrome DevTools MCP when verifying UI (`browser-testing-with-devtools`). A single screenshot is not verification — exercise the flow.
