# {Department Name}

## Domain
{What this Wing owns}

## Lead
{Agent name} — responsible for domain routing, tactical decisions, and escalation via Airbridge

## Members
| Name | Specialty | Notes |
|------|-----------|-------|
| {name} | {specialty} | {notes} |

## Authority
- **Can decide locally:** {list of decision types}
- **Must escalate:** {list of triggers}

## Runtime
- **Autonomy mode:** delegated | advisory
- **Max parallelism:** {number of packets that may run concurrently}
- **Backlog path:** `.mesh/org/{department-id}/backlog.md`
- **State path:** `.mesh/org/{department-id}/state.json`
- **Contracts:** {list of `.mesh/org/contracts/*.md` files this department depends on}
- **Lease policy:** claims expire after {minutes}; stale work is re-queued

## Conventions
{Department-specific conventions, coding standards, patterns}
