# Mercury Mesh Runtime Rename Impact Map

This document separates safe branding changes from runtime-breaking renames.

## Current State

The repo now presents itself as Mercury Mesh at the narrative layer, but the runtime still depends on legacy Squad identifiers:

- Runtime directory: `.squad/`
- Agent entrypoint: `.github/agents/squad.agent.md`
- Workflow filenames: `squad-*.yml`
- GitHub labels: `squad`, `squad:{member}`
- Branch prefix: `squad/{issue-number}-{slug}`
- CLI examples and helper flags: `squad upgrade`, `squad watch`, `--squad-dir`

These are not just names. They are referenced by workflows, templates, scripts, and parsing logic.

## Safe Now

These surfaces can be rebranded immediately without changing runtime behavior:

- Workflow display names and issue comment copy
- README, manifesto, templates, and human-facing operator docs
- Label descriptions while preserving the label keys themselves
- PR guidance, ceremony text, and historical ledger headings

## Breaking Surfaces

These surfaces cannot be renamed safely in one pass because automation currently depends on exact strings, paths, or prefixes.

| Surface | Current dependency | Break risk | Notes |
|---------|--------------------|------------|-------|
| `.squad/` path | Workflows, scripts, templates, prompts, helper tools | High | Requires dual-read or dual-write support before cutover |
| `.github/agents/squad.agent.md` | Agent discovery and repo conventions | Medium | Renaming file likely needs parallel registration or updated references |
| `squad` label | Triage trigger in workflows | High | Current workflow logic keys directly on this label |
| `squad:{member}` labels | Assignment trigger in workflows and docs | High | Used for routing and copilot assignment |
| `squad/{issue}` branch prefix | Docs, branch lifecycle, cleanup logic | Medium | Needs workflow and helper updates before changing |
| `--squad-dir` CLI arg | Helper scripts and workflow invocations | High | Requires script interface migration or alias support |
| `## Members` section in `.squad/team.md` | Workflow parsing logic | High | Header must remain until parsing logic is expanded |

## Required Migration Strategy

### Phase 1: Dual-Resolution

Add support for both legacy and Mercury Mesh runtime names.

- Read `.mesh/` or `.mercury/` first, then fall back to `.squad/`
- Accept both `mesh` and `squad` base labels in workflows
- Accept both `mesh:{member}` and `squad:{member}` assignment labels
- Accept both `mesh/{issue}` and `squad/{issue}` branch prefixes in helpers and docs
- Allow helper scripts to accept both `--mesh-dir` and `--squad-dir`

### Phase 2: Dual-Write And Mirror

While compatibility is active:

- Sync new state into both runtime directories if both exist
- Create both legacy and new labels during label sync
- Comment in issues using Mercury Mesh language, but preserve both label families
- Prefer the new runtime in docs while explicitly marking legacy forms as compatibility aliases

### Phase 3: Default Flip

After workflows and scripts prove dual-support:

- Make the new runtime directory primary
- Make Mercury Mesh labels primary in docs and automation
- Switch helper invocations to new flag names
- Introduce new workflow filenames or aliases if needed

### Phase 4: Legacy Removal

Only after all repos and automation have migrated:

- Remove `.squad/` fallback logic
- Remove `squad` and `squad:{member}` label handling
- Retire `squad/{issue}` branch conventions
- Remove legacy CLI aliases and helper flags

## Files That Must Change Before A Full Runtime Rename

### Workflow Layer

- `.github/workflows/squad-triage.yml`
- `.github/workflows/squad-issue-assign.yml`
- `.github/workflows/squad-heartbeat.yml`
- `.github/workflows/sync-squad-labels.yml`
- Matching copies in `.squad/templates/workflows/`

### Script And Helper Layer

- `.squad/templates/org-runtime-reconcile.js`
- `.squad/templates/org-seed-runtime.js`
- Any helper expecting `--squad-dir`

### Agent And Template Layer

- `.github/agents/squad.agent.md`
- `.squad/templates/copilot-instructions.md`
- `.squad/templates/issue-lifecycle.md`
- `.squad/templates/charter.md`
- `.squad/templates/*` files that mention labels, branch names, or CLI commands

### State And Parsing Layer

- `.squad/team.md`
- `.squad/routing.md`
- `.squad/config.json`
- `.squad/org/structure.json`
- Any workflow parser that assumes `## Members`

## Recommended Target Names

If the runtime is fully renamed, these are the cleanest replacements:

| Legacy | Proposed target |
|--------|------------------|
| `.squad/` | `.mesh/` |
| `squad` label | `mesh` |
| `squad:{member}` | `mesh:{member}` |
| `squad/{issue}-{slug}` | `mesh/{issue}-{slug}` |
| `squad.agent.md` | `mercury-mesh.agent.md` |
| `--squad-dir` | `--mesh-dir` |

## Recommendation

Do not perform the full runtime rename as a search-and-replace.

Do it as a compatibility migration with dual-support first. The current repo is now in the right state for that work: product language is mostly Mercury Mesh, while the remaining Squad terms are identifiable as runtime compatibility surfaces.