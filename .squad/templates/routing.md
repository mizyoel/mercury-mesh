# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| {domain 1} | {Name} | {example tasks} |
| {domain 2} | {Name} | {example tasks} |
| {domain 3} | {Name} | {example tasks} |
| Code review | {Name} | Review PRs, check quality, suggest improvements |
| Testing | {Name} | Write tests, find edge cases, verify fixes |
| Scope & priorities | {Name} | What to build next, trade-offs, decisions |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `mesh` | Triage: analyze issue, assign `mesh:{member}` label | Lead |
| `mesh:{name}` | Pick up issue and complete the work | Named member |
| `squad`, `squad:{name}` | Legacy compatibility labels; trigger the same routing during migration | Coordinator + workflows |
| `dept:{department}` | Add routing metadata for org-mode triage | Coordinator + workflows |

### How Issue Assignment Works

1. When a GitHub issue gets the `mesh` label, the **Lead** triages it — analyzing content, assigning the right `mesh:{member}` label, and commenting with triage notes.
2. When a `mesh:{member}` label is applied, that member picks up the issue in their next session.
3. Legacy `squad` and `squad:{member}` labels continue to trigger the same workflow path during the compatibility phase.
4. `dept:{department}` labels are additive metadata only. They never replace `mesh:{member}` as the primary workflow trigger.
5. Members can reassign by removing their label and adding another member's label.
6. The `mesh` label is the primary inbox. The `squad` label remains a compatibility alias until the default flip is complete.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `mesh:{member}` label is applied to an issue, route to that member. The Lead handles all `mesh` (base label) triage, while `squad` labels remain compatible.

## Hierarchical Routing (Org Mode)

Active when `orgMode: true` in `.mesh/config.json`. If the runtime still lives under `.squad/config.json`, the same rules apply through the compatibility layer. When disabled, all routing falls back to the flat rules above.

### Department Routing

| Department | Lead | Members | Domain Keywords |
|------------|------|---------|-----------------|
| {Department} | {Lead} | {Member 1}, {Member 2} | {keywords that route work into this department} |

### Escalation Routing

| Trigger | Route To | Action |
|---------|----------|--------|
| Member blocked | {Department lead} | Advise, unblock, or re-route within the department |
| Cross-department conflict | {Involved leads} | Run one alignment round, then parallel fan-out |
| Authority exceeded | Mesh | Coordinator decides at org scope |

### Cross-Department Work

When work touches multiple departments:
1. The coordinator matches all relevant departments from `.mesh/org/structure.json`.
2. Members from each matched department are spawned in parallel.
3. Leads are only spawned when conventions conflict or an escalation rule triggers.
4. `mesh:{member}` is the primary assignment trigger. `squad:{member}` remains a compatibility alias, and `dept:{department}` labels are routing metadata only.

## Work Type → Agent

| Work Type | Primary | Secondary |
|-----------|---------|----------|
| architecture, decisions | Danny | — |
| repo mapping, flows | Rusty | — |
| tooling, dependencies | Linus | — |
| app surfaces, usage | Basher | — |
