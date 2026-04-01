# {Department Name} Backlog

Use one row per work packet. IDs must be stable within the department.

| ID | Title | Status | Owner | Lease Expires | Depends On | Contract | Notes |
|----|-------|--------|-------|---------------|------------|----------|-------|
| {dept}-001 | {work packet title} | queued | unassigned | - | - | - | {notes} |

## Rules

- `queued` items may be claimed.
- `claimed` and `in_progress` items must have an owner and lease expiry.
- `blocked` items must state the missing dependency or contract.
- `review` items wait on the department lead or designated reviewer.
- `done` items are append-only history unless explicitly re-opened.
