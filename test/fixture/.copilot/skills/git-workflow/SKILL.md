---
name: "git-workflow"
description: "Mercury Mesh branching model: dev-first workflow with insiders preview channel"
domain: "version-control"
confidence: "high"
source: "team-decision"
---

## Context

Mercury Mesh uses a three-branch model. **All feature work starts from `dev`, not `main`.**

| Branch | Purpose | Publishes |
|--------|---------|-----------|
| `main` | Released, tagged, in-npm code only | `npm publish` on tag |
| `dev` | Integration branch — all feature work lands here | `npm publish --tag preview` on merge |
| `insiders` | Early-access channel — synced from dev | `npm publish --tag insiders` on sync |

## Branch Naming Convention

Issue branches MUST use: `mesh/{issue-number}-{kebab-case-slug}`

Examples:
- `mesh/195-fix-version-stamp-bug`
- `mesh/42-add-profile-api`

> The legacy prefix `mesh/{issue-number}-{slug}` remains compatible during the migration phase.

## Workflow for Issue Work

1. **Branch from dev:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b mesh/{issue-number}-{slug}
   ```

2. **Mark issue in-progress:**
   ```bash
   gh issue edit {number} --add-label "status:in-progress"
   ```

3. **Create draft PR targeting dev:**
   ```bash
   gh pr create --base dev --title "{description}" --body "Closes #{issue-number}" --draft
   ```

4. **Do the work.** Make changes, write tests, commit with issue reference.

5. **Push and mark ready:**
   ```bash
   git push -u origin mesh/{issue-number}-{slug}
   gh pr ready
   ```

6. **After merge to dev:**
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d mesh/{issue-number}-{slug}
   git push origin --delete mesh/{issue-number}-{slug}
   ```

## Parallel Multi-Issue Work (Worktrees)

When the coordinator routes multiple issues simultaneously (e.g., "fix bugs X, Y, and Z"), use `git worktree` to give each agent an isolated working directory. No filesystem collisions, no branch-switching overhead.

### When to Use Worktrees vs Sequential

| Scenario | Strategy |
|----------|----------|
| Single issue | Standard workflow above — no worktree needed |
| 2+ simultaneous issues in same repo | Worktrees — one per issue |
| Work spanning multiple repos | Separate clones as siblings (see Multi-Repo below) |

### Setup

From the main clone (must be on dev or any branch):

```bash
# Ensure dev is current
git fetch origin dev

# Create a worktree per issue — siblings to the main clone
git worktree add ../mesh-195 -b mesh/195-fix-stamp-bug origin/dev
git worktree add ../mesh-193 -b mesh/193-refactor-loader origin/dev
```

**Naming convention:** `../{repo-name}-{issue-number}` (e.g., `../mesh-195`, `../mesh-pr-42`).

Each worktree:
- Has its own working directory and index
- Is on its own `mesh/{issue-number}-{slug}` branch from dev
- Shares the same `.git` object store (disk-efficient)

### Per-Worktree Agent Workflow

Each agent operates inside its worktree exactly like the single-issue workflow:

```bash
cd ../mesh-195

# Work normally — commits, tests, pushes
git add -A && git commit -m "fix: stamp bug (#195)"
git push -u origin mesh/195-fix-stamp-bug

# Create PR targeting dev
gh pr create --base dev --title "fix: stamp bug" --body "Closes #195" --draft
```

All PRs target `dev` independently. Agents never interfere with each other's filesystem.

### Runtime State in Worktrees

The runtime directory (`.mesh/` or `.mesh/`) exists in each worktree as a copy. This is safe because:
- `.gitattributes` declares `merge=union` on append-only files (history.md, decisions.md, logs)
- Each agent appends to its own section; union merge reconciles on PR merge to dev
- **Rule:** Never rewrite or reorder runtime state files in a worktree — append only

### Cleanup After Merge

After a worktree's PR is merged to dev:

```bash
# From the main clone
git worktree remove ../mesh-195
git worktree prune          # clean stale metadata
git branch -d mesh/195-fix-stamp-bug
git push origin --delete mesh/195-fix-stamp-bug
```

If a worktree was deleted manually (rm -rf), `git worktree prune` recovers the state.

---

## Multi-Repo Downstream Scenarios

When work spans multiple repositories (e.g., Mercury Mesh-cli changes need Mercury Mesh-sdk changes, or a user's app depends on Mercury Mesh):

### Setup

Clone downstream repos as siblings to the main repo:

```
~/work/
  Mercury Mesh-pr/          # main repo
  Mercury Mesh-sdk/         # downstream dependency
  user-app/          # consumer project
```

Each repo gets its own issue branch following its own naming convention. If the downstream repo also uses Mercury Mesh conventions, use `mesh/{issue-number}-{slug}`.

### Coordinated PRs

- Create PRs in each repo independently
- Link them in PR descriptions:
  ```
  Closes #42

  **Depends on:** Mercury Mesh-sdk PR #17 (Mercury Mesh-sdk changes required for this feature)
  ```
- Merge order: dependencies first (e.g., Mercury Mesh-sdk), then dependents (e.g., Mercury Mesh-cli)

### Local Linking for Testing

Before pushing, verify cross-repo changes work together:

```bash
# Node.js / npm
cd ../Mercury Mesh-sdk && npm link
cd ../Mercury Mesh-pr && npm link Mercury Mesh-sdk

# Go
# Use replace directive in go.mod:
# replace github.com/org/Mercury Mesh-sdk => ../Mercury Mesh-sdk

# Python
cd ../Mercury Mesh-sdk && pip install -e .
```

**Important:** Remove local links before committing. `npm link` and `go replace` are dev-only — CI must use published packages or PR-specific refs.

### Worktrees + Multi-Repo

These compose naturally. You can have:
- Multiple worktrees in the main repo (parallel issues)
- Separate clones for downstream repos
- Each combination operates independently

---

## Anti-Patterns

- ❌ Branching from main (branch from dev)
- ❌ PR targeting main directly (target dev)
- ❌ Non-conforming branch names (must be Mercury Mesh/{number}-{slug})
- ❌ Committing directly to main or dev (use PRs)
- ❌ Switching branches in the main clone while worktrees are active (use worktrees instead)
- ❌ Using worktrees for cross-repo work (use separate clones)
- ❌ Leaving stale worktrees after PR merge (clean up immediately)

## Promotion Pipeline

- dev → insiders: Automated sync on green build
- dev → main: Manual merge when ready for stable release, then tag
- Hotfixes: Branch from main as `hotfix/{slug}`, PR to dev, cherry-pick to main if urgent
