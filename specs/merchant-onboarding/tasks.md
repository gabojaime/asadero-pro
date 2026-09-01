# Tasks — Merchant onboarding

Ordered checklist. Each task fits one implementer session. Tag: **`vitest`** or **`manual`**.

Open questions are **resolved** (see [requirements.md](./requirements.md)). Implementer still waits for explicit human **implementation** approval (`in_progress`). Do not start from `spec_ready` alone.

---

## 1. Migration specification and local apply

- [ ] Create `supabase/migrations/<timestamp>_initial_schema_and_onboarding.sql` with full DDL, indexes, RLS, `get_user_merchant_id()`, and `create_merchant_and_admin_profile` `SECURITY DEFINER` RPC per [design.md](./design.md)
- [ ] Add nullable columns on `merchants`: `address VARCHAR(255)`, `phone VARCHAR(255)` (via `ALTER TABLE` in same migration)
- [ ] RPC accepts optional `p_address` and `p_phone`; persists NULL when omitted or blank (see design SQL)
- [ ] Include `GRANT EXECUTE` on RPC to `authenticated` only; `REVOKE` from `PUBLIC`
- [ ] Do **not** add tax or legal/public name columns
- [ ] Apply locally: `pnpm dlx supabase db reset` **`manual`**
- [ ] Regenerate types: `pnpm dlx supabase gen types typescript --local > src/shared/infrastructure/database/supabase.types.ts` **`manual`**
- [ ] Update `docs/database-schema.md` to document nullable `merchants.address` and `merchants.phone` **`manual`**

**Verify:** Studio shows `merchants` with `address` and `phone` (nullable); RPC signature includes optional args; RLS enabled; `users.merchant_id` still NOT NULL.

---

## 2. Merchants domain — entities and validations

- [ ] Create `src/domains/merchants/domain/entities.ts` (`Merchant`, `OnboardingInput`, `OnboardingResult`) **`vitest`**
- [ ] Create `src/domains/merchants/domain/validations.ts` (name/full name required; optional address/phone trim + max 255; blank optional → null) **`vitest`**
- [ ] Add `validations.test.ts` with AAA cases: empty, whitespace-only, valid, too-long; optional address/phone omitted vs provided **`vitest`**
- [ ] Create `src/domains/merchants/domain/repository.ts` port **`vitest`**

**Verify:** `pnpm test` passes for merchants validations.

---

## 3. Merchants domain — application and infrastructure

- [ ] Implement `completeMerchantOnboarding` in `application/use-cases.ts` **`vitest`**
- [ ] Implement `supabase-repo.ts`: call RPC with `p_merchant_name`, `p_full_name`, `p_address`, `p_phone`; pass `null` for blank optional fields **`manual`** (integration smoke via onboarding UI later)
- [ ] Implement `useCompleteOnboarding` mutation in `query-adapters.ts` with key invalidation for `['session-profile', userId]` **`manual`**

**Verify:** typecheck; no `@supabase/supabase-js` in presentation.

---

## 4. Auth domain — session profile

- [ ] Define `SessionProfile` in `src/domains/auth/domain/entities.ts` **`vitest`**
- [ ] Define `SessionProfileRepository` port in `domain/repository.ts`
- [ ] Implement `getSessionProfile` use case in `application/use-cases.ts` **`vitest`**
- [ ] Implement `supabase-repo.ts`: read `users` by id; derive `isOnboarded` **`manual`**
- [ ] Implement a **server** helper usable from layouts without putting `@supabase/supabase-js` in `src/app/` **`manual`**
- [ ] Implement `useSessionProfile` in `query-adapters.ts` with key `['session-profile', userId]` (UX only; not the security gate) **`manual`**

**Verify:** onboarded vs not returns correct shape; layouts can call the server helper.

---

## 5. Onboarding UI (DESIGN.md)

- [ ] Create `src/domains/merchants/presentation/components/onboarding-form.tsx` (client): shadcn Card/Input/Label/Button, flat card, no shadow-xl, Spanish copy per design; **four fields** (name required, address optional, phone optional, full name required) **`manual`**
- [ ] Wire form to `useCompleteOnboarding`; show validation and mutation errors with `role="alert"` **`manual`**
- [ ] Create `src/app/(auth)/onboarding/page.tsx` as view container — **not** `(app)/onboarding` **`manual`**
- [ ] Add logout link/button using existing logout component **`manual`**
- [ ] Do **not** restyle login/register; do **not** add business fields to register **`manual`**

**Verify (manual):** visual check against DESIGN.md; keyboard submit; focus states; login/register look unchanged.

---

## 6. Route guards and redirects (server)

- [ ] Create `src/app/(auth)/onboarding/layout.tsx`: unauthenticated → `/login`; onboarded → `/dashboard` **`manual`**
- [ ] Update `src/app/(app)/layout.tsx`: unauthenticated → `/login`; not onboarded → `/onboarding` **`manual`**
- [ ] Confirm `proxy.ts`: `/onboarding` is **not** a public exception; unauthenticated → `/login`; **no** `public.users` query in proxy **`manual`**
- [ ] Confirm login still pushes `/dashboard` and `(app)` layout redirects incomplete users to `/onboarding` **`manual`**
- [ ] Optionally set register `emailRedirectTo` to `/onboarding` (no app-level `email_confirmed_at` check) **`manual`**

**Verify (manual):** AC-3, AC-4, AC-5, AC-7, AC-13 from requirements.

---

## 7. End-to-end smoke and RLS

- [ ] Register new user → (confirm email only if project requires it) → login → complete onboarding (with and without optional address/phone) → land on `/dashboard` **`manual`**
- [ ] Attempt second onboarding RPC call → graceful handling / redirect **`manual`**
- [ ] Optional L4: second merchant/user pair; user A cannot read merchant B **`manual`**
- [ ] Regression: `/login`, `/register`, `/instruments`, `/auth/confirm` still work; login/register styling unchanged **`manual`**

**Verify:** record steps in `progress/merchant-onboarding.md`.

---

## 8. Quality gates

- [ ] `pnpm exec tsc --noEmit` **`manual`**
- [ ] `pnpm lint` **`manual`**
- [ ] `pnpm test` (all domain tests) **`vitest`**
- [ ] Grep: no new `@supabase/supabase-js` imports under `presentation/` or `src/app/` for onboarding path **`manual`**
- [ ] Confirm no `(app)/onboarding` route was added **`manual`**

---

## 9. Deferred follow-ups (do not implement in this feature)

- [ ] Restyle `login-form.tsx` / `sign-up-form.tsx` to DESIGN.md — **defer** (decision 7)
- [ ] Extract login/register to auth use cases / query adapters — **defer**
- [ ] Tax identifiers, tax rate, legal vs public name — **defer** (decisions 2–3)
- [ ] App-level email confirmation gate — **defer** (decision 8)
- [ ] RBAC role redirects (grill_master → kitchen, waiter → orders) — **feature 2**
- [ ] Merchant settings CRUD — **future feature**
- [ ] Staff invites — **out of scope** (decision 5)

---

## Suggested implementer order (vertical slices)

| Session | Tasks | Outcome |
|---------|-------|---------|
| A | 1 | DB + types ready |
| B | 2 + 3 (partial) | Domain + RPC repo |
| C | 4 | Profile read + server helper + query hook |
| D | 5 + 6 | UI in `(auth)/onboarding` + dual layout gates |
| E | 7 + 8 | Verification + polish |

---

## Verification summary

| Task block | Primary tag |
|------------|-------------|
| 1, 3–7 (UI/RLS) | `manual` |
| 2, 8 (tests) | `vitest` |

Feature `verification` in `feature_list.json`: **`manual`**, with Vitest documented in progress journal per [requirements.md](./requirements.md).
