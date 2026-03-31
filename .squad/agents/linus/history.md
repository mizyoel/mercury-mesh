# Linus — History

## Core Context

- **Project:** An existing repository that needs a clear walkthrough of its structure, stack, and how the main pieces fit together.
- **Role:** Systems Analyst
- **Joined:** 2026-03-31T03:13:23.127Z

## Learnings

### 2026-03-31: Pixel Panic browser game

- **Implementation choice:** Built a dependency-free retro arcade survival game called `Pixel Panic` using `index.html`, `styles.css`, and `game.js` at the repo root so it runs by opening the HTML file directly.
- **Game scope:** Single-screen dodge survival loop with keyboard movement, score, lives, enemy pursuit, particle bursts, screen shake, start state, game-over state, and restart on Enter/Space.
- **User preference inferred:** The request favored a polished, small 8-bit browser game over a larger feature set, so the implementation stayed tight and self-contained.

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

### 2026-03-31: 8-bit game implementation complete

- **Delivery:** Shipped Pixel Panic (variant name) with full gameplay: title screen, platforms, hazards, collision, scoring, win/loss/restart
- **Tech:** Pure HTML/CSS/JS, no build pipeline, plays directly in browser
- **Files:** index.html, styles.css, game.js at repo root
- **Decision:** Dependency-free implementation approved and merged to decisions.md
- **Status:** Playable and ready for user interaction
