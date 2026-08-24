# Progress journals

One markdown file per feature, updated **chronologically** as work happens.

This is asadero-pro (not Reental). Do not write Notion URLs as the source of truth; disk files are the source of truth.

## Pattern

```
progress/
├── README.md
└── <feature-id>.md
```

File name = feature `id` from `feature_list.json` (slug, lowercase, hyphenated).

## Entry format

Each append includes:

- **Timestamp** (`YYYY-MM-DD HH:MM` or ISO)
- **Agent** — leader | spec_author | implementer | reviewer | web-performance-auditor | human
- **Action** — what was done
- **Changes** — files touched (implementer)
- **Notes** — blockers, decisions, verification

### Starter

```markdown
# Feature: <title>

| Field | Value |
|-------|-------|
| id | <id> |
| status | pending |
| spec | specs/<id>/ |
| verification | manual \| automated |

## 2026-08-24 — leader

**Action:** Feature added to backlog (`pending`).
```

Implementer entries:

```markdown
## YYYY-MM-DD HH:MM — implementer

**Task:** tasks.md §N — short title

**Changes:**
- path/to/file.ts — what changed

**Verification:** Vitest / manual step taken or pending

**Notes:** blockers, decisions, follow-ups
```

Reviewer entries: verdict `pass` | `pass_with_notes` | `fail` (English), plus findings.

## Rules

1. **Append only** — do not delete or rewrite past entries (fix mistakes with a follow-up entry)
2. **Write before chat** — persist to disk before summarizing in conversation
3. **Link to spec** — reference `specs/<feature>/tasks.md` items when implementing
4. **Verification** — implementer adds the table from `docs/verification.md` before review

## Who writes what

| Agent | Updates progress? |
|-------|-------------------|
| leader | Yes — status changes, orchestration notes |
| spec_author | No (specs only); leader may log spec kickoff |
| implementer | Yes — primary author during implementation |
| reviewer | Yes — review verdict section |
| web-performance-auditor | Yes — `## Web Performance Audit` (English) |
| notion-task-manager | Never in this repo |
| human | Optional — approval notes |
