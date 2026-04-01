# Mercury Mesh Runtime Rename Impact Map

This document separates safe branding changes from runtime-breaking renames.

## Current State (Post Phase 4)

All four migration phases are complete. The runtime identity is now Mercury Mesh end-to-end:

- **Runtime directory resolution:** `.mesh/` primary, `.mercury/` alternate. `.squad/` is no longer in the helper candidate list.
- **Agent entrypoint:** `.github/agents/mercury-mesh.agent.md` (sole agent; `squad.agent.md` deleted).
- **Workflow filenames:** `mesh-triage.yml`, `mesh-issue-assign.yml`, `mesh-heartbeat.yml`, `sync-mesh-labels.yml` (all `squad-*.yml` stubs deleted).
- **GitHub labels:** `mesh` base label, `mesh:{member}` assignment labels only. No `squad` / `squad:*` labels created or consumed.
- **Branch prefix:** `mesh/{issue-number}-{slug}`.
- **CLI flags:** `--mesh-dir` only. `--squad-dir` removed from all helpers.
- **Physical directory:** The on-disk directory remains `.squad/` — a future physical rename is a separate operation.
- **Internal variable names:** Helper scripts still use `squadDir` internally as a variable name; this is cosmetic and has no functional impact.

## Implemented In Phase 1

The repo now has partial dual-resolution support in the active automation surface:

- Active GitHub workflows resolve `.mesh`, `.mercury`, or `.squad` before falling back to older paths.
- Active GitHub workflows accept both `mesh` and `squad` base labels and both `mesh:{member}` and `squad:{member}` assignment labels.
- Label sync creates both label families during the compatibility phase.
- Ralph and org helper scripts accept both `--mesh-dir` and `--squad-dir`.
- Helper scripts use runtime-aware default paths when the runtime root is `.mesh` or `.mercury`.
- Schedule and seeded org templates now default to `.mesh` paths instead of reintroducing `.squad` in new installs.
- Seed-facing instructions and charters now describe `.mesh` as the primary runtime root while keeping `.squad` documented as a compatibility alias.
- Branch prefix documented as `mesh/{issue}` primary with `squad/{issue}` compat across git-workflow SKILL, issue-lifecycle, and copilot-instructions.
- Agent governance (`squad.agent.md`) updated: Init flow, dept commands, config refs, spawn templates, and model selection all reference active runtime root.
- Economy-mode and model-selection SKILLs use active runtime root pattern instead of hardcoded `.squad/config.json`.

Phase 1 in this repo is therefore active on the main workflow path and now extends into the seed/runtime scaffolding layer, but it is not complete across every downstream package or documentation artifact.

## Implemented In Phase 2

Phase 2 dual-write is now active across all org helper scripts. When both a primary runtime root (e.g. `.mesh`) and an alternate root (e.g. `.squad`) contain a `config.json`, every state write is replicated to both roots.

### What was added

- **Shared utilities** (`findAlternateRoot`, `mirrorPath`, `mirrorFileWrite`/`mirrorFileAppend`) added to all four template helpers.
- **org-runtime-reconcile.js**: State JSON, backlog markdown, and decision inbox entries are mirrored to the alternate root after each write.
- **org-backlog-from-triage.js**: Backlog markdown updates are mirrored to the alternate root when `--apply` is used.
- **org-seed-runtime.js**: All seeded files (charters, backlogs, state, contracts, installed scripts) are mirrored. Template loading falls back across runtime roots so `.mesh` can find templates in `.squad/templates/` and vice versa.
- **org-status.js**: Read-only; no mirroring needed. Utilities present for consistency.
- **Installed copies** (`.squad/org/*.js`) synced from updated templates.

### Mirror activation rule

Mirroring only activates when `findAlternateRoot(primaryDir)` locates a sibling runtime directory that contains `config.json`. If only one root exists, no mirror write occurs. This makes the dual-write layer zero-cost for repos that haven't yet created a second runtime root.

## Implemented In Phase 3

Phase 3 flips the default so `.mesh` is the primary runtime identity. Legacy `squad-*` names are preserved as deprecated stubs.

### What was changed

- **Workflow filenames:** New `mesh-triage.yml`, `mesh-issue-assign.yml`, `mesh-heartbeat.yml`, `sync-mesh-labels.yml` are the active workflows. The old `squad-*.yml` files are now `workflow_dispatch`-only stubs that print a deprecation notice.
- **Label check order:** Workflows now check `mesh`/`mesh:*` before `squad`/`squad:*` in `if:` conditions.
- **Agent entrypoint:** `mercury-mesh.agent.md` is the primary agent definition. `squad.agent.md` is a thin redirect.
- **Agent content:** Governance root references `.mesh/manifesto.md` (falls back to `.squad/` for legacy installs). Bridge nomenclature documents `.mesh/` as primary, `.squad/` as legacy alias.
- **Helper fallback:** `defaultRuntimeDir()` falls back to `.mesh` instead of `.squad` when no runtime directory is found on disk.
- **Template copies:** `mesh-*.yml` template workflow copies created alongside `squad-*.yml` in `.squad/templates/workflows/`. Template agent file synced. Installed org helpers synced.
- **SYNC comment** in heartbeat workflow updated to reference `mesh-heartbeat.yml` paths.

## Implemented In Phase 4

Phase 4 removes all legacy Squad compatibility code. The runtime is fully Mercury Mesh.

### What was removed

- **RUNTIME_DIR_CANDIDATES:** `.squad` removed from all four template helpers. Candidates are now `['.mesh', '.mercury']`.
- **`--squad-dir` CLI flag:** Removed from all helpers. `--mesh-dir` is the sole flag.
- **Dual-write utilities:** `findAlternateRoot`, `mirrorPath`, `mirrorFileWrite`, `mirrorFileAppend` removed from all helpers. Mirror calls stripped from reconcile, backlog-from-triage, and seed-runtime.
- **`ALTERNATE_ROOTS` mapping:** Removed from all helpers.
- **`primaryDir` / `__runtimeDir` plumbing:** Removed; helpers pass only `squadDir` internally.
- **Deprecated workflow stubs:** `squad-triage.yml`, `squad-issue-assign.yml`, `squad-heartbeat.yml`, `sync-squad-labels.yml` deleted from `.github/workflows/`.
- **`squad.agent.md`:** Deleted. `mercury-mesh.agent.md` is the sole agent file.
- **Workflow label triggers:** `squad` and `squad:*` label conditions removed from triage and issue-assign workflows.
- **Label sync:** `squad` base label and `squad:{member}` labels no longer created by `sync-mesh-labels.yml`.
- **Agent file:** ~120 `squad` references in `mercury-mesh.agent.md` replaced with Mercury Mesh / `.mesh/` equivalents.
- **Template workflows:** Legacy `squad-*.yml` templates removed; renamed to `mesh-*.yml`.
- **Installed helpers:** `.squad/org/*.js` synced from cleaned templates.

## Safe Now

These surfaces can be rebranded immediately without changing runtime behavior:

- Workflow display names and issue comment copy
- README, manifesto, templates, and human-facing operator docs
- Label descriptions while preserving the label keys themselves
- PR guidance, ceremony text, and historical ledger headings

## Breaking Surfaces (Resolved)

All previously breaking surfaces have been migrated:

| Surface | Resolution |
|---------|-----------|
| `.squad/` path | Helpers resolve `.mesh/` or `.mercury/` only; physical dir rename is a future optional step |
| `.github/agents/squad.agent.md` | Deleted; replaced by `mercury-mesh.agent.md` |
| `squad` label | Removed from workflow triggers; `mesh` is sole base label |
| `squad:{member}` labels | Removed from workflow triggers; `mesh:{member}` is sole assignment label |
| `squad/{issue}` branch prefix | Replaced with `mesh/{issue}` in all docs and skills |
| `--squad-dir` CLI arg | Removed; `--mesh-dir` is sole flag |
| `## Members` in team.md | Unchanged — parsing logic still keys on this header |

## Still Pending

- **Physical directory rename:** The on-disk `.squad/` directory has not been renamed to `.mesh/`. This is a separate operation that requires updating all template paths and installed file locations.
- **Downstream packages:** External CLI packages or template mirrors outside this workspace may still reference legacy names.
- **Internal variable names:** Helper scripts use `squadDir` as a variable name internally — cosmetic only.

## Required Migration Strategy

### Phase 1: Dual-Resolution ✅

### Phase 2: Dual-Write And Mirror ✅

### Phase 3: Default Flip ✅

### Phase 4: Legacy Removal ✅

## Files Changed During Migration

### Workflow Layer

- `.github/workflows/mesh-triage.yml` (was `squad-triage.yml`)
- `.github/workflows/mesh-issue-assign.yml` (was `squad-issue-assign.yml`)
- `.github/workflows/mesh-heartbeat.yml` (was `squad-heartbeat.yml`)
- `.github/workflows/sync-mesh-labels.yml` (was `sync-squad-labels.yml`)
- Template copies in `.squad/templates/workflows/` renamed to `mesh-*`

### Script And Helper Layer

- `.squad/templates/org-runtime-reconcile.js`
- `.squad/templates/org-backlog-from-triage.js`
- `.squad/templates/org-seed-runtime.js`
- `.squad/templates/org-status.js`
- Installed copies in `.squad/org/`

### Agent And Template Layer

- `.github/agents/mercury-mesh.agent.md` (was `squad.agent.md`)
- `.squad/templates/copilot-instructions.md`
- `.squad/templates/issue-lifecycle.md`

## Recommendation

The runtime identity migration is complete within this repo. The only remaining step is the optional physical directory rename (`.squad/` → `.mesh/`), which can be done when all downstream consumers have been verified.