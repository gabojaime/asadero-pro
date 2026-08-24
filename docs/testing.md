# Testing — asadero-pro

Core business logic tests for the BBQ MVP. Source: `.cursor/rules/03-logic-tdd.md`.

## Scope

- **In:** pure functions in `src/domains/*/domain/` and deterministic application helpers
- **Out unless a spec says otherwise:** React components, Next routes, live Supabase

Framework: **Vitest**. AAA structure. Tests colocated: `validations.ts` → `validations.test.ts`.

## Immutability

Do not use `Array.prototype.push` or in-place object mutation in domain logic. Return new copies.

## Cart and recipe deduction (canonical examples)

Keep these behaviors when implementing `orders` / `raw-materials` domain:

- `addItemToCart` increments quantity when the menu item id already exists; otherwise appends a new line. Always returns a new array.
- `calculateCartTotal` is `sum(price * quantity)`.
- `processOrderDeduction` clones inventory, rejects the whole update when any ingredient lacks stock, and rounds kg to 3 decimals.

See `.cursor/rules/03-logic-tdd.md` for the full reference implementation and Vitest examples. Copy those functions into `domain/` rather than into UI files.

## AAA

1. **Arrange** — isolated fixtures, no shared mutable DB
2. **Act** — one function call
3. **Assert** — precise expectations (not the entire payload, not generated ids/timestamps)
4. Tests must run in any order

## Anti-patterns (reviewer fails these)

- Mutable updates without cloning
- Tests that depend on another test’s side effects
- Vague asserts (`expect(true).toBe(true)`)
- All-knowing oracles coupled to irrelevant fields
