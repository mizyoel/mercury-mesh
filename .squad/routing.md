# Bridge Routing

How the Mesh decides who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| {domain 1} | {Name} | {example tasks} |
| {domain 2} | {Name} | {example tasks} |
| {domain 3} | {Name} | {example tasks} |
| Code review | {Name} | Review PRs, check quality, suggest improvements |
| Testing | {Name} | Write tests, find edge cases, verify fixes |
| Scope & priorities | {Name} | What to build next, trade-offs, decisions |
| Black Box logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |
| `dept:{department}` | Add routing metadata for org-mode triage | Coordinator + workflows |

Legacy label note: the bridge keeps `squad` and `squad:{member}` labels until workflow automation is migrated. Treat them as compatibility labels, not product language.

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it as the bridge inbox — analyzing content, assigning the right `squad:{member}` label, and commenting with telemetry notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. `dept:{department}` labels are additive metadata only. They never replace `squad:{member}` as the workflow trigger.
4. Members can reassign by removing their label and adding another member's label.
5. The `squad` label is the inbox gravity well for untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → Ship's Computer answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.

## Hierarchical Routing (Org Mode)

Active when `orgMode: true` in `.squad/config.json`. When disabled, all routing falls back to the flat rules above.

### Department Routing

| Department | Lead | Members | Domain Keywords |
|------------|------|---------|-----------------|

### Department Runtime Rules

1. **Supervised autonomy** — the Ship's Computer remains the control plane. Department leads may decompose and prioritize local work, but all actual agent spawns still flow through the coordinator.
2. **Queue before execution** — when work lands in a department, the lead may convert it into work packets in `.squad/org/{department}/backlog.md` before members begin execution.
3. **Claim before work** — a member may only start a packet that is `queued` and unclaimed.
4. **Lease every claim** — claimed work must record an owner and lease expiry in `.squad/org/{department}/state.json`.
5. **Re-queue stale work** — expired claims return to `queued` when allowed by config.
6. **Contract-first cross-department work** — if two departments depend on one another, define or update a contract in `.squad/org/contracts/` before parallel execution.
7. **Lead review on probation or conflict** — probationary outputs and cross-department conflicts route to the department lead before coordinator synthesis.

### Autonomous Department Loop

1. Coordinator routes the mission to the relevant Wing or Deck lead.
2. Lead decomposes it into local packets.
3. Coordinator fans out independent packets to eligible members in parallel.
4. Members update backlog and state via the drop-box pattern and department state files.
5. Lead resolves local blockers; unresolved blockers escalate to coordinator.
