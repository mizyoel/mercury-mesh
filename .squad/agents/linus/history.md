# Linus — History

## Core Context

- **Project:** An existing repository that needs a clear walkthrough of its structure, stack, and how the main pieces fit together.
- **Role:** Systems Analyst
- **Joined:** 2026-03-31T03:13:23.127Z

## Learnings

### 2026-03-31: Org Hierarchy Tooling Audit

- **Config pattern:** Optional feature flags (`orgMode`) with default-disabled behavior ensures backward compatibility. New fields should be additive, not required.
- **Workflow safety:** GitHub workflows parse `## Members` by column position (cells[0], cells[1]). Adding columns is safe; renaming/reordering breaks parsing.
- **Hierarchy metadata:** Dept leads and scope tags are routing information, not mandatory spawns. Reduces latency and complexity.
- **Label strategy:** `squad:{member}` labels remain workflow triggers; `dept:*` labels are routing-only. No conflicts because they serve different purposes.
- **File paths for org mode:** `.squad/org/structure.json` (hierarchy), `.squad/org/migration.md` (rollout plan), `.squad/config.json` (feature flag).
- **Coordinator changes:** Danny owns squad.agent.md routing logic updates. Linus handles config/tooling surface.

### 2026-03-31: Org hierarchy rollout audit complete (team coordination)

- **Config v2 deployed:** orgMode=false by default; orgConfig schema fields enable hierarchical escalation and cross-dept routing without affecting flat mode
- **Workflow verification:** Squad-triage.yml, squad-issue-assign.yml, sync-squad-labels.yml all safe from column reordering (position-based parsing)
- **Integration confirmed:** Danny's coordinator changes align with config pattern; both Danny and Linus changes work together for staged rollout
- **Status:** Tooling surface ready; configuration safe for org hierarchy activation when orgMode is enabled
