# {Department Name}

## Domain
{What this department owns}

## Lead
{Agent name} — responsible for domain routing, tactical decisions, and escalation

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
- **Backlog path:** `.squad/org/{department-id}/backlog.md`
- **State path:** `.squad/org/{department-id}/state.json`
- **Contracts:** {list of `.squad/org/contracts/*.md` files this department depends on}
- **Lease policy:** claims expire after {minutes}; stale work is re-queued

## Conventions
{Department-specific conventions, coding standards, patterns}
