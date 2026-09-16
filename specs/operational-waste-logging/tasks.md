# Tasks — Operational Waste Logging

**Gate:** Human closed **OQ-1–OQ-5** (see [requirements.md](./requirements.md#resolved-decisions-locked)). History day timezone: **`America/Caracas`**.

Ordered for vertical slices. Check verification type per task.

## 1 — Schema and RPC

- [ ] **T1** Add migration `operational_waste_logging`: extend `inventory_movements` (`waste_log` type, `waste_log_id`, quantity checks) — **manual** db reset / push
- [ ] **T2** Implement `log_operational_waste` SECURITY DEFINER RPC (role guard, insert log, decrement stock, movement audit, partial flag) — **manual** SQL smoke
- [ ] **T3** Tighten RLS INSERT on `waste_logs` to `admin` + `grill_master` only (locked OQ-4) — **manual** L4
- [ ] **T4** Regenerate Supabase TypeScript types — **manual**

## 2 — Domain (Vitest)

- [ ] **T5** Add `WasteReason`, `OperationalWasteLog*` types and `WASTE_REASON_LABELS_ES` — **vitest** N/A
- [ ] **T6** Implement `calculateWasteLogTotalCost` + tests (rounding, zero weight rejected) — **vitest**
- [ ] **T7** Implement `validateOperationalWasteInput` (Zod) + tests — **vitest**
- [ ] **T8** Extend `OperationalWasteRepository` port in `domain/repository.ts` — **vitest** N/A

## 3 — Application (Vitest)

- [ ] **T9** `logOperationalWaste` use case (role guard, validation, repo delegate) + fake repo tests — **vitest**
- [ ] **T10** `listOperationalWasteLogsForDay` (calendar day bounds in `America/Caracas`; not rolling 24h) + tests — **vitest**
- [ ] **T11** Map RPC error codes to domain/application errors — **vitest**

## 4 — Infrastructure

- [ ] **T12** `supabase-operational-waste-repo.ts` (RPC + list query with joins) — **manual** L3
- [ ] **T13** `operational-waste-actions.ts` server actions (session profile, never trust client merchantId) — **manual** L2
- [ ] **T14** Read port or action for kg raw materials picker (active, unit kilogram) — **manual** L2

## 5 — RBAC and routing

- [ ] **T15** Add `/waste-log` to `rbac.ts` (+ tests in `rbac.test.ts`) — **vitest**
- [ ] **T16** Create `(app)/waste-log/layout.tsx` with `RoleRouteGate` (`admin`, `grill_master`) — **manual** L2
- [ ] **T17** Create `(app)/waste-log/page.tsx` view container — **manual** L2
- [ ] **T18** Update `app-sidebar.tsx`: **“Registrar merma”** for allowed roles; keep **“Merma y costos”** on `/waste` admin-only — **manual** L2
- [ ] **T19** Optional: link from kitchen queue header to `/waste-log` — **manual** L2

## 6 — Presentation

- [ ] **T20** Extend waste `query-adapters.ts` (or dedicated file): `useLogOperationalWaste`, `useOperationalWasteLogsToday` — **manual** L2
- [ ] **T21** `OperationalWasteLogView.tsx` — form per DESIGN.md waste input row — **manual** L2
- [ ] **T22** Today history list/table with empty/loading/error states — **manual** L2
- [ ] **T23** Partial-stock warning UI when RPC returns `partial: true` — **manual** L2
- [ ] **T24** Admin-only cross-link to `/waste` costing — **manual** L2

## 7 — Documentation and verification

- [ ] **T25** Update `docs/database-schema.md` movement types and RLS note — **manual**
- [ ] **T26** Run full Vitest suite + `tsc` — **vitest**
- [ ] **T27** Manual smoke: grill_master log → row in history → stock down → movement row — **manual** L3
- [ ] **T28** Manual RLS: waiter denied; cross-tenant denied — **manual** L4
- [ ] **T29** Update `progress/operational-waste-logging.md` (implementer) — **manual**

## Dependency note

[specs/dashboard-metrics/](../dashboard-metrics/) implementation should proceed **after** T2+T12 validate `waste_logs` writes, or dashboard Waste % / Food Cost waste numerator will remain empty in dev.
