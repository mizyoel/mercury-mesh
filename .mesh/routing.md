# Work Routing

How to decide who handles what.

Every user prompt enters the Lead first. The tables below describe the delegation map the Lead uses after first-pass review.

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
| `mesh`, `Mercury Mesh:{name}` | Legacy compatibility labels; trigger the same routing during migration | Coordinator + workflows |
| `dept:{department}` | Add routing metadata for org-mode triage | Coordinator + workflows |

### How Issue Assignment Works

1. When a GitHub issue gets the `mesh` label, the **Lead** triages it — analyzing content, assigning the right `mesh:{member}` label, and commenting with triage notes.
2. When a `mesh:{member}` label is applied, that member picks up the issue in their next session.
3. Legacy `mesh` and `mesh:{member}` labels continue to trigger the same workflow path during the compatibility phase.
4. `dept:{department}` labels are additive metadata only. They never replace `mesh:{member}` as the primary workflow trigger.
5. Members can reassign by removing their label and adding another member's label.
6. The `mesh` label is the primary inbox. The `mesh` label remains a compatibility alias until the default flip is complete.

## Rules

1. **Lead-first intake** — every fresh user prompt routes to the Lead for review before any specialist receives it.
2. **Eager by default** — once the Lead delegates, spawn all agents who could usefully start work, including anticipatory downstream work.
3. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
4. **Quick facts can return to the coordinator** — but only after the Lead decides no specialist or department work is needed.
5. **When two agents could handle it**, the Lead picks the one whose domain is the primary concern.
6. **"Team, ..." → fan-out.** The Lead decomposes the mission, then all relevant agents spawn in parallel as `mode: "background"`.
7. **Anticipate downstream work.** If a feature is being built, the Lead should also route the tester to write test cases from requirements simultaneously.
8. **Issue-labeled work** — when a `mesh:{member}` label is applied to an issue, route to that member. The Lead handles all `mesh` (base label) triage, while `mesh` labels remain compatible.

## Hierarchical Routing (Org Mode)

Active when `orgMode: true` in `.mesh/config.json`. If the runtime still lives under `.mesh/config.json`, the same rules apply through the compatibility layer. When disabled, all routing falls back to the flat rules above.

Department members do not receive first-touch user prompts directly. The Lead reviews the request, chooses the department path, and only then delegates into the org.

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
1. The coordinator sends the prompt to the Lead for first-pass review.
2. The Lead matches all relevant departments from `.mesh/org/structure.json` and decides whether department leads or individual members should take first touch.
3. Members from each matched department are spawned in parallel only after that delegation plan is set.
4. Department leads join whenever decomposition, contract alignment, or escalation is needed.
5. `mesh:{member}` is the primary assignment trigger. `mesh:{member}` remains a compatibility alias, and `dept:{department}` labels are routing metadata only.

## Work Type → Agent

| Work Type | Primary | Secondary |
|-----------|---------|----------|
| architecture, decisions | Danny | — |
| repo mapping, flows | Rusty | — |
| tooling, dependencies | Linus | — |
| app surfaces, usage | Basher | — |
