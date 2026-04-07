---
name: "distributed-mesh"
description: "How to coordinate with meshes on different machines using git as transport"
domain: "distributed-coordination"
confidence: "high"
source: "multi-model-consensus (config-driven model routing)"
---

## SCOPE

**✅ THIS SKILL PRODUCES (exactly these, nothing more):**

1. **`mesh.json`** — Generated from user answers about zones and meshes (which meshes participate, what zone each is in, paths/URLs for each), using `mesh.json.example` in this skill's directory as the schema template
2. **`sync-mesh.sh` and `sync-mesh.ps1`** — Copied from this skill's directory into the project root (these are bundled resources, NOT generated code)
3. **Zone 2 state repo initialization** (if applicable) — If the user specified a Zone 2 shared state repo, run `sync-mesh.sh --init` to scaffold the state repo structure
4. **A decision entry** in `.mesh/decisions/inbox/` documenting the mesh configuration for team awareness

**❌ THIS SKILL DOES NOT PRODUCE:**

- **No application code** — No validators, libraries, or modules of any kind
- **No test files** — No test suites, test cases, or test scaffolding
- **No GENERATING sync scripts** — They are bundled with this skill as pre-built resources. COPY them, don't generate them.
- **No daemons or services** — No background processes, servers, or persistent runtimes
- **No modifications to existing Mercury Mesh files** beyond the decision entry (no changes to team.md, routing.md, agent charters, etc.)

**Your role:** Configure the mesh topology and install the bundled sync scripts. Nothing more.

## Context

When meshes are on different machines (developer laptops, CI runners, cloud VMs, partner orgs), the local file-reading convention still works — but remote files need to arrive on your disk first. This skill teaches the pattern for distributed Mercury Mesh communication.

**When this applies:**
- meshes span multiple machines, VMs, or CI runners
- meshes span organizations or companies
- An agent needs context from a Mercury Mesh whose files aren't on the local filesystem

**When this does NOT apply:**
- All meshes are on the same machine (just read the files directly)

## Patterns

### The Core Principle

> "The filesystem is the mesh, and git is how the mesh crosses machine boundaries."

The agent interface never changes. Agents always read local files. The distributed layer's only job is to make remote files appear locally before the agent reads them.

### Three Zones of Communication

**Zone 1 — Local:** Same filesystem. Read files directly. Zero transport.

**Zone 2 — Remote-Trusted:** Different host, same org, shared git auth. Transport: `git pull` from a shared repo. This collapses Zone 2 into Zone 1 — files materialize on disk, agent reads them normally.

**Zone 3 — Remote-Opaque:** Different org, no shared auth. Transport: `curl` to fetch published contracts (SUMMARY.md). One-way visibility — you see only what they publish.

### Agent Lifecycle (Distributed)

```
1. SYNC:    git pull (Zone 2) + curl (Zone 3) — materialize remote state
2. READ:    cat .mesh/**/state.md — all files are local now
3. WORK:    do their assigned work (the agent's normal task, NOT mesh-building)
4. WRITE:   update own billboard, log, drops
5. PUBLISH: git add + commit + push — share state with remote peers
```

Steps 2–4 are identical to local-only. Steps 1 and 5 are the entire distributed extension. **Note:** "WORK" means the agent performs its normal Mercury Mesh duties — it does NOT mean "build mesh infrastructure."

### The mesh.json Config

```json
{
  "meshes": {
    "auth-Mercury Mesh": { "zone": "local", "path": "../auth-Mercury Mesh/.mesh" },
    "ci-Mercury Mesh": {
      "zone": "remote-trusted",
      "source": "git@github.com:our-org/ci-Mercury Mesh.git",
      "ref": "main",
      "sync_to": ".mesh/remotes/ci-Mercury Mesh"
    },
    "partner-fraud": {
      "zone": "remote-opaque",
      "source": "https://partner.dev/Mercury Mesh-contracts/fraud/SUMMARY.md",
      "sync_to": ".mesh/remotes/partner-fraud",
      "auth": "bearer"
    }
  }
}
```

Three zone types, one file. Local meshes need only a path. Remote-trusted need a git URL. Remote-opaque need an HTTP URL.

### Write Partitioning

Each Mercury Mesh writes only to its own directory (`boards/{self}.md`, `meshes/{self}/*`, `drops/{date}-{self}-*.md`). No two meshes write to the same file. Git push/pull never conflicts. If push fails ("branch is behind"), the fix is always `git pull --rebase && git push`.

### Trust Boundaries

Trust maps to git permissions:
- **Same repo access** = full mesh visibility
- **Read-only access** = can observe, can't write
- **No access** = invisible (correct behavior)

For selective visibility, use separate repos per audience (internal, partner, public). Git permissions ARE the trust negotiation.

### Phased Rollout

- **Phase 0:** Convention only — document zones, agree on mesh.json fields, manually run `git pull`/`git push`. Zero new code.
- **Phase 1:** Sync script (~30 lines bash or PowerShell) when manual sync gets tedious.
- **Phase 2:** Published contracts + curl fetch when a Zone 3 partner appears.
- **Phase 3:** Never. No MCP federation, A2A, service discovery, message queues.

**Important:** Phases are NOT auto-advanced. These are project-level decisions — you start at Phase 0 (manual sync) and only move forward when the team decides complexity is justified.

### Mesh State Repo

The shared mesh state repo is a plain git repository — NOT a Mercury Mesh project. It holds:
- One directory per participating Mercury Mesh
- Each directory contains at minimum a SUMMARY.md with the Mercury Mesh's current state
- A root README explaining what the repo is and who participates

No `.mesh/` folder, no agents, no automation. Write partitioning means each Mercury Mesh only pushes to its own directory. The repo is a rendezvous point, not an intelligent system.

If you want a Mercury Mesh that *observes* mesh health, that's a separate Mercury Mesh project that lists the state repo as a Zone 2 remote in its `mesh.json` — it does NOT live inside the state repo.

## Examples

### Developer Laptop + CI Mercury Mesh (Zone 2)

Auth-Mercury Mesh agent wakes up. `git pull` brings ci-Mercury Mesh's latest results. Agent reads: "3 test failures in auth module." Adjusts work. Pushes results when done. **Overhead: one `git pull`, one `git push`.**

### Two Orgs Collaborating (Zone 3)

Payment-Mercury Mesh fetches partner's published SUMMARY.md via curl. Reads: "Risk scoring v3 API deprecated April 15. New field `device_fingerprint` required." The consuming agent (in payment-Mercury Mesh's team) reads this information and uses it to inform its work — for example, updating payment integration code to include the new field. Partner can't see payment-Mercury Mesh's internals.

### Same Org, Shared Mesh Repo (Zone 2)

Three meshes on different machines. One shared git repo holds the mesh. Each Mercury Mesh: `git pull` before work, `git push` after. Write partitioning ensures zero merge conflicts.

## AGENT WORKFLOW (Deterministic Setup)

When a user invokes this skill to set up a distributed mesh, follow these steps **exactly, in order:**

### Step 1: ASK the user for mesh topology

Ask these questions (adapt phrasing naturally, but get these answers):

1. **Which meshes are participating?** (List of Mercury Mesh names)
2. **For each Mercury Mesh, which zone is it in?**
   - `local` — same filesystem (just need a path)
   - `remote-trusted` — different machine, same org, shared git access (need git URL + ref)
   - `remote-opaque` — different org, no shared auth (need HTTPS URL to published contract)
3. **For each Mercury Mesh, what's the connection info?**
   - Local: relative or absolute path to their `.mesh/` directory
   - Remote-trusted: git URL (SSH or HTTPS), ref (branch/tag), and where to sync it to locally
   - Remote-opaque: HTTPS URL to their SUMMARY.md, where to sync it, and auth type (none/bearer)
4. **Where should the shared state live?** (For Zone 2 meshes: git repo URL for the mesh state, or confirm each Mercury Mesh syncs independently)

### Step 2: GENERATE `mesh.json`

Using the answers from Step 1, create a `mesh.json` file at the project root. Use `mesh.json.example` from THIS skill's directory (`.mesh/skills/distributed-mesh/mesh.json.example`) as the schema template.

Structure:

```json
{
  "meshes": {
    "<Mercury Mesh-name>": { "zone": "local", "path": "<relative-or-absolute-path>" },
    "<Mercury Mesh-name>": {
      "zone": "remote-trusted",
      "source": "<git-url>",
      "ref": "<branch-or-tag>",
      "sync_to": ".mesh/remotes/<Mercury Mesh-name>"
    },
    "<Mercury Mesh-name>": {
      "zone": "remote-opaque",
      "source": "<https-url-to-summary>",
      "sync_to": ".mesh/remotes/<Mercury Mesh-name>",
      "auth": "<none|bearer>"
    }
  }
}
```

Write this file to the project root. Do NOT write any other code.

### Step 3: COPY sync scripts

Copy the bundled sync scripts from THIS skill's directory into the project root:

- **Source:** `.mesh/skills/distributed-mesh/sync-mesh.sh`
- **Destination:** `sync-mesh.sh` (project root)

- **Source:** `.mesh/skills/distributed-mesh/sync-mesh.ps1`
- **Destination:** `sync-mesh.ps1` (project root)

These are bundled resources. Do NOT generate them — COPY them directly.

### Step 4: RUN `--init` (if Zone 2 state repo exists)

If the user specified a Zone 2 shared state repo in Step 1, run the initialization:

**On Unix/Linux/macOS:**
```bash
bash sync-mesh.sh --init
```

**On Windows:**
```powershell
.\sync-mesh.ps1 -Init
```

This scaffolds the state repo structure (Mercury Mesh directories, placeholder SUMMARY.md files, root README).

**Skip this step if:**
- No Zone 2 meshes are configured (local/opaque only)
- The state repo already exists and is initialized

### Step 5: WRITE a decision entry

Create a decision file at `.mesh/decisions/inbox/<your-agent-name>-mesh-setup.md` with this content:

```markdown
### <YYYY-MM-DD>: Mesh configuration

**By:** <your-agent-name> (via distributed-mesh skill)

**What:** Configured distributed mesh with <N> meshes across zones <list-zones-used>

**meshes:**
- `<Mercury Mesh-name>` — Zone <X> — <brief-connection-info>
- `<Mercury Mesh-name>` — Zone <X> — <brief-connection-info>
- ...

**State repo:** <git-url-if-zone-2-used, or "N/A (local/opaque only)">

**Why:** <user's stated reason for setting up the mesh, or "Enable cross-machine Mercury Mesh coordination">
```

Write this file. The Scribe will merge it into the main decisions file later.

### Step 6: STOP

**You are done.** Do not:
- Generate sync scripts (they're bundled with this skill — COPY them)
- Write validator code
- Write test files
- Create any other modules, libraries, or application code
- Modify existing Mercury Mesh files (team.md, routing.md, charters)
- Auto-advance to Phase 2 or Phase 3

Output a simple completion message:

```
✅ Mesh configured. Created:
- mesh.json (<N> meshes)
- sync-mesh.sh and sync-mesh.ps1 (copied from skill bundle)
- Decision entry: .mesh/decisions/inbox/<filename>

Run `bash sync-mesh.sh` (or `.\sync-mesh.ps1` on Windows) before agents start to materialize remote state.
```

---

## Anti-Patterns

**❌ Code generation anti-patterns:**
- Writing `mesh-config-validator.js` or any validator module
- Writing test files for mesh configuration
- Generating sync scripts instead of copying the bundled ones from this skill's directory
- Creating library modules or utilities
- Building any code that "runs the mesh" — the mesh is read by agents, not executed

**❌ Architectural anti-patterns:**
- Building a federation protocol — Git push/pull IS federation
- Running a sync daemon or server — Agents are not persistent. Sync at startup, publish at shutdown
- Real-time notifications — Agents don't need real-time. They need "recent enough." `git pull` is recent enough
- Schema validation for markdown — The LLM reads markdown. If the format changes, it adapts
- Service discovery protocol — mesh.json is a file with 10 entries. Not a "discovery problem"
- Auth framework — Git SSH keys and HTTPS tokens. Not a framework. Already configured
- Message queues / event buses — Agents wake, read, work, write, sleep. Nobody's home to receive events
- Any component requiring a running process — That's the line. Don't cross it

**❌ Scope creep anti-patterns:**
- Auto-advancing phases without user decision
- Modifying agent charters or routing rules
- Setting up CI/CD pipelines for mesh sync
- Creating dashboards or monitoring tools
