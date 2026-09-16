# Feature: Operational Waste Logging (Registro de merma)

| Field | Value |
|-------|-------|
| id | operational-waste-logging |
| status | spec_ready |
| spec | specs/operational-waste-logging/ |
| verification | automated (domain math; UI/RLS/RBAC remain hybrid/manual at implement time) |

## 2026-09-16 15:26 — leader

**Action:** Human approved `specs/operational-waste-logging/` (explicit approval). Feature recorded in `feature_list.json` as `spec_ready`. Verification set to `automated` for domain math (Vitest). **Not** moved to `in_progress`. Implementer not started. Notion not invoked.

**Locked decisions (spec_author + human):**
- History / “today” calendar day: tenant timezone **America/Caracas** (Venezuela)
- OQs closed as recommended: no waiter; partial stock decrement + warning; route `/waste-log`; RLS `admin` + `grill_master`; calendar today

**Notes:**
- Next step when the user asks: `in_progress` → implementer.
- `dashboard-metrics` stays blocked on this feature; do not start that implementer until waste logs can be written.
