# Squad Decisions

## Active Decisions

### 2026-03-31T00:00:00Z: Implement additive org hierarchy routing
**By:** Danny  
**Scope:** org  
**What:** Added feature-flagged org hierarchy support with `.squad/org/` artifacts, department metadata in roster/registry, and workflow support for `dept:*` labels while preserving `squad:{member}` as the assignment trigger.  
**Why:** This introduces hierarchical routing without breaking the flat model; rollback is a single `orgMode: false` switch.

### 2026-03-31T03:00:00Z: 8-Bit Browser Game Architecture
**By:** Danny  
**Scope:** org  
**What:** Standardized the first implementation of the repo's 8-bit browser game as a static, single-page Canvas 2D game named **Pixel Climber**. The approved architecture is a five-module vanilla JavaScript layout (`main`, `game`, `render`, `input`, `level-data`) with a fixed 320x240 internal resolution and a 60 Hz fixed-timestep simulation.  
**Why:** Vanilla browser stack vs framework/build tooling provides lower setup cost and fewer failure modes in an otherwise-empty repo, at the cost of less ergonomics. Canvas vs DOM gameplay provides better fit for retro rendering, camera movement, and deterministic draw order. Fixed authored level vs procedural content enables faster implementation and tuning for a first playable.

### 2026-03-31T04:00:00Z: 8-Bit Browser Game Design: Pixel Climber
**By:** Basher  
**Scope:** org  
**What:** Defined minimal viable 8-bit browser game for quick implementation: **Pixel Climber**, a vertical arcade platformer where the player climbs a tower of 25 platforms in 2–3 minutes. Win at the top, die on falling off bottom. Score +10 per platform cleared, +50 per 5th platform bonus. Simple 2/4-color palette, no external assets.  
**Why:** Fast to build with no art pipeline; clear retro feel through simple geometry and palette constraints; tight scope (feature-complete in ~500 lines of JS) with no scope creep risk; obvious win/lose states and single-screen play eliminate menu complexity.

### 2026-03-31T05:00:00Z: Browser Game Kept Dependency-Free
**By:** Linus  
**Scope:** dept:analysis  
**What:** Implemented the requested 8-bit game as a self-contained HTML/CSS/JS arcade survival game with no external libraries or build tooling.  
**Why:** The repo had no existing app scaffold, and a direct browser-openable game keeps runtime friction low while meeting the request cleanly.

### 2026-03-31T06:00:00Z: Tighten Org Hierarchy Assignment Metadata and Validation
**By:** Rusty  
**Scope:** org  
**What:** Extended the issue assignment workflow to preserve department context in comments and Copilot assignment instructions, and expanded validators to check `.squad/org/` artifacts plus roster/registry/workflow consistency for hierarchy mode.  
**Why:** The hierarchy scaffold was mostly in place, but assignment handoff and validation still had low-risk gaps that could hide drift between team roster, registry, and workflow metadata.

### 2026-03-31T06:30:00Z: Org Hierarchy Tooling & Config
**By:** Linus  
**Scope:** org  
**What:** Made safe, isolated tooling changes to support hierarchical routing: added optional config.json fields (`orgMode: false`, `org.structure`, `org.decisionScopes`) and extended team.md schema for optional department column while preserving `## Members` header and backward compatibility.  
**Why:** Additive schema with sensible defaults ensures no breaking changes. All workflows already parse `## Members` by column position, so adding optional columns is safe. `orgMode` flag enables safe rollout (flip boolean to activate).

## Decision Entry Format

Use this structure when decisions are added:

```markdown
### 2026-03-31T10:00:00Z: Decision title
**By:** Agent Name
**Scope:** org | team | dept:{name}
**What:** Short decision summary.
**Why:** Trade-off and rationale.
```

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Prefer `**Scope:** org` unless the decision is explicitly local to one department
