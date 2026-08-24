# Specs — asadero-pro

How feature specifications are written, stored, and approved.

## Process

```
pending → spec_author writes specs/<feature>/ → spec_ready → HUMAN APPROVAL → in_progress
```

Do **not** use the user-level `spec-driven-development` skill or create `tasks/plan.md`. `spec_author` writes only under `specs/<feature>/`.

## Folder

```
specs/<feature>/
├── README.md          # Overview, goals, out of scope
├── requirements.md    # Functional and non-functional requirements
├── design.md          # UI/flow, components, data model, ports/adapters
└── tasks.md           # Ordered, checkable implementation tasks
```

`<feature>` matches `feature_list.json` `id` (lowercase, hyphenated).

## Content language

Spec files are **English**. User-facing conversation about the spec is Spanish.

## What to include

### README.md

- Problem and goals
- In scope / out of scope
- Roles affected (`admin`, `grill_master`, `waiter`)
- Links to `requirements.md`, `design.md`, `tasks.md`

### requirements.md

- Numbered requirements (FR-1, NFR-1)
- Acceptance criteria that can be verified (manual UI and/or Vitest)
- Multi-tenant / RLS constraints when data is involved
- Open questions for human approval — do not silently invent product behavior

### design.md

- User flow (auth vs app route group)
- Domain touchpoints: `entities`, ports, use cases, query adapters, presentation
- Tables/columns from `docs/database-schema.md` (or a new migration if the spec extends schema)
- Performance budgets when UI is chart-heavy or list-heavy
- **UI features:** reference [DESIGN.md](../DESIGN.md) — tokens (color, type, radius), Tailwind/shadcn mapping, and which DESIGN.md components to reuse (e.g. Metric Tile, waste input row, live order queue). Do not specify a competing palette or shadow system.
- **No Reental/Web3/GraphQL sections** unless a future spec explicitly adds them

### tasks.md

- Ordered checkboxes, each small enough for one implementer session
- Vertical slices where possible (one path through domain → infrastructure → UI)
- Note verification type per task (`vitest` vs `manual`)

## Approval

Leader presents a short Spanish summary. Implementation starts only after **explicit human approval** and `feature_list.json` status `in_progress`.

## After approval

Do not edit spec files during implementation. If the spec is wrong, escalate to leader / `spec_author` for a spec patch and re-approval.
