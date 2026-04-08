```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║    ███╗   ███╗███████╗██████╗  ██████╗██╗   ██╗██████╗ ██╗   ██╗          ║
║    ████╗ ████║██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝          ║
║    ██╔████╔██║█████╗  ██████╔╝██║     ██║   ██║██████╔╝ ╚████╔╝           ║
║    ██║╚██╔╝██║██╔══╝  ██╔══██╗██║     ██║   ██║██╔══██╗  ╚██╔╝            ║
║    ██║ ╚═╝ ██║███████╗██║  ██║╚██████╗╚██████╔╝██║  ██║   ██║             ║
║    ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝╚═╝  ╚═╝   ╚═╝             ║
║                                                                            ║
║    ███╗   ███╗███████╗███████╗██╗  ██╗                                     ║
║    ████╗ ████║██╔════╝██╔════╝██║  ██║                                     ║
║    ██╔████╔██║█████╗  ███████╗███████║                                     ║
║    ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║                                     ║
║    ██║ ╚═╝ ██║███████╗███████║██║  ██║                                     ║
║    ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝                                     ║
║                                                                            ║
║    C O M M A N D   T H E   D R I F T .                                    ║
║    The Fluid OS for Autonomous Operations.                                 ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  CANDIDATE DISCLOSURE                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  STATUS           :: EXPERIMENTAL — NOT PRODUCTION-CERTIFIED               │
│  APPROVED THEATER :: R&D · SANDBOXES · AI WORKFLOW EXPERIMENTS             │
│  HULL WARNING     :: APIs AND CLI MAY REFORM BETWEEN RELEASES              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Bridge

Commander, welcome aboard.

You are standing on a zero-gravity command bridge. Below you — a living mesh of specialist Wings that shard, converge, and reform around whatever mission is pulling the most gravity. You set the trajectory. The mesh handles thrust, decomposition, routing, and course correction. The Nervous System breathes underneath — routing Sorties by gravitational intent, patrolling Drift autonomously, growing Ghost Wings from the Void, remembering every maneuver in spatial coordinates.

There is no org chart here. Structure is a responsive medium. Wings drift toward the work. The work gets done. The mesh reforms.

```text
  Commander ──▶ Bridge ──▶ Wings ──▶ Telemetry ──▶ Course Correction
                  │          │            │
                  │          │            └──▶ The Black Box
                  │          └───────────────▶ The Loom
                  └─────────────────────────▶ Gravimetry
```

**Runtime Identity** — Labels: `mesh | mesh:{member}` · Branches: `mesh/{issue}` · Workflows: `mesh-*.yml` · Directory: `.mesh/`

---

## Docking Sequence

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  DOCKING SEQUENCE                                                          │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  REQUIRES            │  Node ≥22 · Git · GitHub Copilot (VS Code or CLI)  │
├──────────────────────┴──────────────────────────────────────────────────────┤
│                                                                            │
│  01 ▸ cd your-project                                                     │
│  02 ▸ npm install @mizyoel/mercury-mesh                                   │
│  03 ▸ npx mercury-mesh init                                               │
│  04 ▸ gh auth login              # GitHub access for MCP (one-time)       │
│  05 ▸ Open in VS Code — or — launch Copilot CLI                           │
│                                                                            │
│  Existing hull files are never overwritten unless --force is passed.       │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  SCAFFOLDED PAYLOAD                                                        │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  .github/agents/*.agent.md   │  Bridge governance prompt                   │
│  .github/copilot-instruct…   │  Coding agent instructions                 │
│  .github/workflows/          │  Triage, labels, heartbeat                  │
│  .copilot/skills/            │  All Mercury Mesh skills                    │
│  .copilot/mcp-config.json    │  MCP server config                         │
│  .mesh/config.json           │  Bridge parameters (defaults)               │
│  .mesh/local.json            │  Git-ignored secrets & local overrides      │
│  .mesh/manifesto.md          │  The Flight Path                            │
│  .mesh/routing.md            │  Mission routing rules                      │
│  .mesh/ceremonies.md         │  Review & retro rituals                     │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### Hull Upgrade

Refresh the hull without touching your config or state files.

```sh
npm update @mizyoel/mercury-mesh
npx mercury-mesh update          # refreshes managed scaffold assets
                                 # agent, instructions, skills, runtime docs, workflows
                                 # preserves config, local overrides, MCP config, and state files
```

### Copilot CLI Docking

```sh
winget install GitHub.cli          # or brew install gh
gh auth login
gh extension install github/gh-copilot
gh copilot --version               # verify thrusters
cd your-project
gh copilot                         # interactive session — bridge is live
@mercury-mesh <mission>            # declare your Sortie
```

| Surface | Mechanism | Agent File |
|---------|-----------|------------|
| VS Code | `runSubagent` / agent — Telemetry inline | `.github/agents/mercury-mesh.agent.md` |
| Copilot CLI | `task` / `read_agent` — same bridge logic | `.github/agents/mercury-mesh.agent.md` |

### Semantic Embeddings (optional)

Higher-fidelity Gravimetry. The Nervous System defaults to TF-IDF — zero dependencies. To arm OpenRouter embeddings:

```jsonc
// .mesh/local.json
{ "nervousSystem": { "embeddingApiKey": "<openrouter-key>" } }

// .mesh/config.json
{ "nervousSystem": { "enabled": true, "embeddingProvider": "openrouter",
    "embeddingModel": "openai/text-embedding-3-small" } }
```

`init` creates `local.json` and adds it to `.gitignore` automatically.

---

## Bridge Commands

Every dial on the console, Commander.

| Command | Mission |
|---------|---------|
| `npx mercury-mesh init [--force] [--target <path>]` | Dock the mesh into a repository |
| `npx mercury-mesh update [--target <path>]` | Refresh managed scaffold assets while preserving config and local overrides |
| `npx mercury-mesh doctor [--target <path>]` | 27-point hull integrity sweep |
| `npx mercury-mesh status [--target <path>]` | Telemetry HUD |
| `npx mercury-mesh resume [--session <id>] [--target]` | Session briefing |
| `npx mercury-mesh create-skill <name> [--description]` | Forge a new skill |
| `npx mercury-mesh eject [--target <path>]` | Undock — remove `.mesh/` |
| `npx mercury-mesh worktree list\|status\|prune` | Worktree parallelism |
| `npx mercury-mesh coalescence scan\|apply` | Ghost Wing overlap merge |
| `npx mercury-mesh peers list\|register\|sync\|health\|prune` | Distributed mesh fleet |
| `npx mercury-mesh version` | Hull version |

---

## Hull Schematic

```text
.github/
  agents/mercury-mesh.agent.md   :: bridge governance, control plane
  workflows/                     :: triage, labels, heartbeat

.mesh/
  config.json                    :: bridge parameters
  team.md                        :: roster (empty = INIT MODE)
  routing.md                     :: mission routing rules
  decisions.md                   :: The Black Box
  nervous-system/                :: the organism's living nervous system
    index.js                     :: spinal cord — unified orchestrator
    semantic-gravimetry.js       :: intent → gravity field → Wing
    autonomic-core.js            :: metabolism + Drift patrol
    ghost-wing.js                :: emergent topology from the Void
    constellation-memory.js      :: spatial vector memory + RAG
    worktree-manager.js          :: parallel Wing execution
    ghost-coalescence.js         :: overlap detection + merge
    mesh-peer.js                 :: multi-machine coordination

.copilot/
  mcp-config.json                :: MCP server configuration
```

---

## The Nervous System

The mesh is not a framework, Commander. It is a living organism. Four subsystems compose the autonomic layer — each breathes independently and degrades gracefully when starved.

### I. Semantic Gravimetry

The death of keyword routing. Every Wing's domain is embedded as a high-dimensional vector. When a Sortie enters the mesh, its intent is projected into the same space. Cosine similarity produces a gravity field — a spatial map of which Wings resonate with the work.

| Gravity Share | Resolution |
|---------------|------------|
| Single Wing ≥ 70% | Direct route — one clear attractor |
| Multiple Wings ≥ 20% each | Airbridge — temporary cross-Wing link |
| No Wing ≥ 15% | The Void — Ghost Wing synthesis may trigger |

Providers: `"tfidf"` (zero-dep default) · `"openrouter"` (higher fidelity) · `"llm"` (legacy alias). Keyword fallback when the Nervous System is offline.

### II. The Autonomic Core

The death of CI-driven state. A persistent metabolism loop pulses through all Wing state files, scanning Drift Weather, detecting anomalies — expired leases, stale heartbeats, parallelism breaches, context decay — firing corrections, and recording every action in the Black Box.

### III. Ghost Wing Synthesis

The death of static templates. When a Sortie falls into the Void — uncharted territory where no Wing exerts pull — the mesh synthesizes a Ghost Wing: a transient department with auto-generated charter, backlog, and state. Solidifies after N successes. Dissolves after N failures. Commander approval required by default.

### IV. Constellation Memory

The death of flat files. A spatial vector index over every decision, every Ghost Wing outcome, every correction. New Sorties query for structural resonance — the top results are pre-loaded as RAG context into Wing context windows before thrusters fire. Backends: `"json"` (default) or `"lancedb"` (optional).

### Coalescence

When multiple Ghost Wings emerge from overlapping Void pockets, the mesh detects structural overlap via Jaccard scoring. Auto-merge ≥ 0.65. Flag for Commander review 0.35–0.65. Ignore < 0.35.

### Worktree Parallelism

Wings that need isolated file system state execute in parallel via `git worktree`. Branch: `mesh/{issue}-{slug}`. Orphaned worktrees auto-pruned.

### Distributed Peers

Multi-machine fleet. Each node registers in a peer registry with deterministic identity, heartbeat, health classification, and Constellation sync via content-hash deduplication.

---

## Bridge Parameters

Your control surface, Commander. Every flag is a dial on the console. Stored in `.mesh/config.json` (schema v2).

<details>
<summary>Full config reference — expand to view all dials</summary>

| Property | Type | Effect |
|----------|------|--------|
| `version` | `number` | Schema version. Current: `2`. |
| `orgMode` | `boolean` | Wing/Deck departmental structure (`true`) or flat team (`false`). |
| `halted` | `boolean` | **HALT Sentinel** — freezes all spawns and writes. |
| `allowedModels` | `string[]` | Model allowlist. Empty = allow all. |
| `modelRouting.default` | `string` | Default model for auto-selection. |
| `modelRouting.taskTypes` | `object` | Per-category routing: `code`, `prompts`, `docs`, `lead`, `visual`. |
| `modelRouting.fallbacks` | `object` | Fallback chains: `premium`, `standard`, `fast`. |
| `orgConfig.autonomyMode` | `string` | `"delegated"` (bridge assigns) or `"autonomous"` (Wings self-select). |
| `orgConfig.crossDeptStrategy` | `string` | `"contract-first"` or `"ad-hoc"` Airbridges. |
| `orgConfig.escalationBehavior` | `string` | `"advisory"` or `"blocking"`. |
| `orgConfig.maxParallelismPerDepartment` | `number` | Max concurrent spawns per Wing. |
| `orgConfig.claimLeaseMinutes` | `number` | Claim expiry before requeue. |
| `orgConfig.heartbeatMinutes` | `number` | Agent Telemetry interval. |
| `orgConfig.requeueExpiredClaims` | `boolean` | Return expired claims to backlog. |
| `missionControl.breakWorkIntoMissions` | `boolean` | Decompose work into Sorties. |
| `missionControl.defaultRoadmapDepth` | `number` | Flight Path checkpoint count. |
| `missionControl.headerStyle` | `string` | `"ascii-art"` for banner headers. |
| `missionControl.reportStyle` | `string` | `"ascii-command-deck"` for console panels. |
| `missionControl.showRoadmapInReplies` | `boolean` | Flight Path visible in replies. |
| `missionControl.telemetryCadence` | `string` | `"per-batch"` or `"on-change"`. |
| `missionControl.requiredFields` | `string[]` | e.g. `["mission","status","next","risks"]`. |
| `humanTiers.tier1/2/3` | `string[]` | Authority tiers (full / approve / read-only). |
| `onboarding.defaultPhase` | `string` | `"shadow"` (observe) or `"probation"` (execute under review). |
| `onboarding.autoPromoteThreshold` | `boolean\|number` | Auto-promote after N tasks, or `false` for Tier-1 gate. |
| `nervousSystem.enabled` | `boolean` | Activate the Nervous System. |
| `nervousSystem.embeddingProvider` | `string` | `"tfidf"`, `"openrouter"`, or `"llm"` (legacy). |
| `nervousSystem.embeddingApiKey` | `string\|null` | API key (prefer `.mesh/local.json`). |
| `nervousSystem.embeddingModel` | `string\|null` | Model override. |
| `nervousSystem.embeddingEndpoint` | `string\|null` | Endpoint override. |
| `nervousSystem.gravimetry.*` | | `minimumGravity` (0.15), `airbridgeThreshold` (0.70), `airbridgeMinShare` (0.20). |
| `nervousSystem.autonomic.*` | | `pulseMs` (30000), `contextDecayMinutes` (60), `applyCorrections` (true). |
| `nervousSystem.ghostWings.*` | | `enabled`, `autoMaterialize` (false), `solidificationThreshold` (3), `dissolutionThreshold` (2), `maxLifespanHours` (72). |
| `nervousSystem.constellation.*` | | `enabled`, `ragMaxEntries` (5), `ragMinSimilarity` (0.15), `provider` ("json"/"lancedb"). |
| `nervousSystem.peers.*` | | `enabled` (false), `heartbeatOnPulse` (true), `syncOnPulse` (false), `heartbeatTTLMinutes` (30). |

</details>

---

## Signal Lexicon

The mesh speaks its own physics, Commander. One language across every surface.

| Standard Signal | Mesh Term | Function |
|-----------------|-----------|----------|
| Department | Wing / Deck | Domain-scoped execution group |
| Project | Mission / Sortie | Deployment into a problem space |
| Documentation | The Black Box | Immutable decision ledger |
| Roadmap | The Flight Path | Long-range strategic direction |
| Task Status | Telemetry | Live HUD readout |
| Alignment State | The Drift | Deviation from mission vector |
| Unknown Territory | The Void | Uncharted problem-space |
| Cross-Team Sync | Airbridge | Temporary wing-to-wing link |
| Knowledge Base | The Loom | Shared knowledge fabric |
| Routing Engine | Gravimetry | Semantic intent-to-Wing mapping |
| Health Monitor | Autonomic Core | Metabolism + Drift correction |
| Temporary Team | Ghost Wing | Emergent department — solidifies or dissolves |
| Memory Index | Constellation Memory | Spatial vector memory |

---


## Credits

Mercury Mesh tips its hull to [Squad](https://github.com/bradygaster/squad) by Brady Gaster — the project that proved AI agent teams belong inside your repository, not outside it.

---

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║    DOCKING CLEARANCE :: MIT                                                ║
║                                                                            ║
║    You provide the intent. The mesh provides the thrust.                   ║
║                                                                            ║
║    Zero gravity. Full velocity.                                            ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
