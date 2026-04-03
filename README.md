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
│  BRIDGE LOGIN                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  OPERATOR        :: COMMANDER AUTHORIZED                                   │
│  SYSTEM          :: MERCURY MESH v2                                        │
│  CLASS           :: FLUID ORGANIZATIONAL OPERATING SYSTEM (F-OS)           │
│  PHYSICS         :: ZERO GRAVITY / LIQUID STRUCTURE / LIVE TELEMETRY       │
│  RUNTIME         :: .mesh/                                                 │
│  HULL INTEGRITY  :: NOMINAL                                                │
│  DRIFT           :: WITHIN TOLERANCE                                       │
│  STATUS          :: READY FOR SORTIE                                       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

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
│  Existing files are never overwritten unless --force is passed.            │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  SCAFFOLDED PAYLOAD                                                        │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  .github/agents/*.agent.md   │  Copilot custom agent prompt               │
│  .github/copilot-instruct…   │  Coding agent instructions                 │
│  .github/workflows/          │  GitHub Actions workflows                   │
│  .copilot/skills/            │  All Mercury Mesh skills                    │
│  .copilot/mcp-config.json    │  MCP server config                         │
│  .mesh/config.json           │  Runtime config (defaults)                  │
│  .mesh/local.json            │  Git-ignored secrets & local overrides      │
│  .mesh/manifesto.md          │  The Flight Path                            │
│  .mesh/routing.md            │  Mission routing rules                      │
│  .mesh/ceremonies.md         │  Ceremonies & rituals                       │
├──────────────────────────────┴──────────────────────────────────────────────┤
│  UPGRADE                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  npm update @mizyoel/mercury-mesh                                          │
│  npx mercury-mesh update          # refreshes agent, skills, instructions  │
│                                   # config + state files untouched         │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  SEMANTIC EMBEDDINGS (optional)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  .mesh/local.json   →  { "nervousSystem":                                 │
│                            { "embeddingApiKey": "<openrouter-key>" } }     │
│                                                                            │
│  .mesh/config.json  →  { "nervousSystem":                                 │
│                            { "enabled": true,                              │
│                              "embeddingProvider": "openrouter",            │
│                              "embeddingModel":                             │
│                                "openai/text-embedding-3-small" } }        │
│                                                                            │
│  init creates local.json and adds it to .gitignore automatically.          │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  CLI REFERENCE                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  npx mercury-mesh init    [--force] [--target <path>]   scaffold project   │
│  npx mercury-mesh update  [--target <path>]             upgrade agent      │
│  npx mercury-mesh version                               print version      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GitHub Copilot CLI — Quick Start

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  COPILOT CLI DOCKING                                                       │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  REQUIRES            │  GitHub CLI (gh) · Copilot extension · Node ≥22    │
├──────────────────────┴──────────────────────────────────────────────────────┤
│                                                                            │
│  INSTALL CLI + EXTENSION                                                   │
│  ─────────────────────                                                     │
│  01 ▸ winget install GitHub.cli          # or brew install gh              │
│  02 ▸ gh auth login                                                       │
│  03 ▸ gh extension install github/gh-copilot                              │
│                                                                            │
│  VERIFY                                                                    │
│  ──────                                                                    │
│  04 ▸ gh copilot --version                                                │
│                                                                            │
│  LAUNCH MESH VIA CLI                                                       │
│  ───────────────────                                                       │
│  05 ▸ cd your-project                                                     │
│  06 ▸ gh copilot                         # interactive Copilot session     │
│  07 ▸ @mercury-mesh <mission>            # bridge is live                  │
│                                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  SURFACE NOTES                                                             │
├────────────────────────┬────────────────────────────────────────────────────┤
│  VS Code               │  Uses runSubagent / agent — results inline        │
│  Copilot CLI            │  Uses task / read_agent — same bridge logic       │
│  Agent file             │  .github/agents/mercury-mesh.agent.md             │
│  Auth                   │  gh auth login         │
└────────────────────────┴────────────────────────────────────────────────────┘
```

## System Initialization

Welcome to the bridge, Commander.

This repository boots **Mercury Mesh** — a zero-gravity bridge where human intent and specialist AI wings operate as one fluid organism. You define trajectory. The mesh handles thrust, decomposition, coordination, and course correction. A living nervous system routes work by gravitational intent, monitors drift autonomously, grows new Wings from the Void, and remembers every maneuver in spatial coordinates.

There is no org chart here. There is no hierarchy to climb. Structure is a responsive medium that forms, shards, and reforms around whatever mission is pulling the most gravity. Wings drift toward the work. The work gets done. The mesh reforms.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  INTENT VECTOR                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Commander ──▶ Bridge ──▶ Wings ──▶ Telemetry ──▶ Course Correction        │
│                  │          │            │                                  │
│                  │          │            └──▶ The Black Box                 │
│                  │          └───────────────▶ The Loom                      │
│                  └─────────────────────────▶ Mission Routing                │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

The runtime identity is fully Mercury Mesh. Every surface speaks the same name.

```text
RUNTIME IDENTITY

  Labels     :: mesh | mesh:{member}
  Branches   :: mesh/{issue}
  Workflows  :: mesh-*.yml
  Directory  :: .mesh/
```

No status theater. No org-chart drag. Only signal.

---

## Commanding the Drift

State the mission. The bridge decomposes, routes, and executes.

Mercury Mesh supports both GitHub Copilot in VS Code and GitHub Copilot CLI. The bridge logic is surface-aware: CLI uses `task` and `read_agent`, while VS Code uses `runSubagent` or `agent` and receives results inline.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  SORTIE BOOT SEQUENCE                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  01 ▸ Open this repository in VS Code or a GitHub Copilot CLI session.     │
│  02 ▸ Start a Mercury Mesh session on that surface.                        │
│  03 ▸ If the roster is empty, the bridge enters INIT MODE.                 │
│  04 ▸ Declare the mission: language, stack, and required outcome.          │
│  05 ▸ Confirm the bridge cast.                                             │
│  06 ▸ Fire thrusters.                                                      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Once the crew is cast, the mesh is live. Wings self-organize around the gravity well. Telemetry flows to the bridge. You read the mission — not the room.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TELEMETRY SWEEP                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Commander Link   ████████████████████  LOCKED                             │
│  Mission Clarity  ████████████████████  HIGH                               │
│  Wing Alignment   ██████████████████░░  CONVERGING                         │
│  Drift Error      ██░░░░░░░░░░░░░░░░░░  NOMINAL                           │
│  Status Theater   ░░░░░░░░░░░░░░░░░░░░  PURGED                            │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Zero-Gravity Architecture

There is no up or down. Only the mission.

Missions act as gravity wells — pulling the right wings into orbit, holding them until the sortie is complete, then releasing them to drift toward the next well. No reorgs. No restructuring. Just continuous, purposeful reconfiguration.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  RUNTIME SCHEMATIC                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  .github/                                                                  │
│    agents/mercury-mesh.agent.md   :: bridge governance, control plane      │
│    workflows/                     :: issue triage, labels, heartbeat       │
│                                                                            │
│  .mesh/                                                                    │
│    config.json                    :: runtime flags, bridge state            │
│    team.md                        :: bridge roster (empty = INIT MODE)     │
│    routing.md                     :: mission routing rules                 │
│    ceremonies.md                  :: review and retro triggers             │
│    decisions.md                   :: The Black Box                         │
│    org/                           :: wing runtime, contracts, state        │
│    templates/                     :: agent, skill, and workflow templates  │
│    nervous-system/                :: the organism's living nervous system   │
│      index.js                     :: unified orchestrator (spinal cord)    │
│      semantic-gravimetry.js       :: intent-based gravitational routing    │
│      autonomic-core.js            :: persistent metabolism + drift patrol  │
│      ghost-wing.js                :: emergent topology from the Void       │
│      constellation-memory.js      :: spatial vector memory + RAG           │
│                                                                            │
│  .copilot/                                                                 │
│    mcp-config.json                :: MCP server configuration              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

```text
  MESH TOPOLOGY                  FLUID DYNAMICS

       ◉─────────◉              shard ──▶ route ──▶ converge
      ╱ ╲       ╱ ╲                            │
    ◉───◉─────◉───◉            execute ◀───────┘
      ╲ ╱       ╲ ╱                │
       ◉─────────◉              record ──▶ reform ──▶ drift
                                                        │
   Wings converge on                                    │
   gravity wells. The            ◀──── next gravity well ┘
   mesh reforms after
   every sortie.
```

---

## The Nervous System

The mesh is not a framework. It is a living organism. The nervous system is what makes it breathe.

Four subsystems compose the organism's autonomic layer. Each can operate independently and degrades gracefully when unavailable. Together, they replace static conventions with biological responses to the problem space.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  NERVOUS SYSTEM ARCHITECTURE                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  I. SEMANTIC      │    │ II. AUTONOMIC    │    │ III. GHOST WING  │      │
│  │  GRAVIMETRY       │    │ CORE             │    │ SYNTHESIS        │      │
│  │                   │    │                  │    │                  │      │
│  │  Intent → Vector  │    │  Pulse → Scan    │    │  Void → Grow     │      │
│  │  Vector → Gravity │    │  Scan → Correct  │    │  Grow → Prove    │      │
│  │  Gravity → Wing   │    │  Correct → Log   │    │  Prove → Solid   │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                │
│           └───────────┬───────────┴───────────┬───────────┘                │
│                       ▼                       ▼                            │
│              ┌──────────────────────────────────────┐                      │
│              │  IV. CONSTELLATION MEMORY             │                      │
│              │                                       │                      │
│              │  Every decision, every correction,    │                      │
│              │  every Ghost Wing outcome — embedded   │                      │
│              │  as spatial coordinates. The mesh      │                      │
│              │  remembers in dimensions, not pages.   │                      │
│              └──────────────────────────────────────┘                      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase I — Semantic Gravimetry

The death of keyword routing.

Every Wing's domain, authority scope, and routing keywords are embedded into a high-dimensional signature vector. When a Sortie enters the mesh, its intent is projected into the same space. Cosine similarity between the Sortie vector and all Wing vectors produces a **gravity field** — a spatial map of which Wings resonate with the work.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  GRAVITY FIELD RESOLUTION                                                  │
├───────────────────────┬────────────────────────────────────────────────────┤
│  Single Wing ≥ 70%    │  Direct route. One Wing is the clear attractor.   │
│  gravity share        │                                                    │
├───────────────────────┼────────────────────────────────────────────────────┤
│  Multiple Wings each  │  Airbridge. Gravity is distributed — temporary    │
│  ≥ 20% share          │  cross-Wing link formed automatically.            │
├───────────────────────┼────────────────────────────────────────────────────┤
│  No Wing ≥ 15%        │  The Void. Uncharted territory. Ghost Wing        │
│  similarity           │  synthesis may trigger.                            │
└───────────────────────┴────────────────────────────────────────────────────┘
```

Two embedding providers are available:

| Provider | Config | Dependencies | Use Case |
|----------|--------|-------------|----------|
| TF-IDF | `"tfidf"` | None | Zero-dependency default. Built-in vectorizer. |
| OpenRouter | `"openrouter"` | `nervousSystem.embeddingApiKey` in `.mesh/local.json` | Higher-fidelity intent resolution via OpenRouter embeddings. |

Legacy note: `"llm"` remains supported as a compatibility alias for the older OpenAI-compatible endpoint path.

Keyword routing is fully preserved as a fallback when the nervous system is offline.

### Phase II — The Autonomic Core

The death of CI-driven state.

A persistent metabolism loop that continuously pulses, reading Drift Weather across all department state files. It does not wait for webhooks or human triggers.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  METABOLISM CYCLE                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  pulse ──▶ scan drift weather ──▶ detect anomalies ──▶ fire corrections    │
│    │                                                        │              │
│    │         ┌────────────────────┐                          │              │
│    │         │  ANOMALY SENSORS   │                          │              │
│    │         │  • Expired leases  │                          ▼              │
│    │         │  • Stale heartbeat │                   record in Black Box   │
│    │         │  • Parallelism     │                          │              │
│    │         │    breach          │                          │              │
│    │         │  • Context decay   │                          │              │
│    │         └────────────────────┘                          │              │
│    │                                                        │              │
│    ◀────────────────── wait pulseMs ────────────────────────┘              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Expired claim leases are automatically re-queued. Stale heartbeats and parallelism breaches are logged as corrections. The Core also monitors file system changes and fires immediate pulses on state mutations.

### Phase III — Ghost Wing Synthesis

The death of static templates.

When a Sortie possesses a gravitational signature that matches none of the existing Wings, the mesh no longer routes to a fallback lead. It synthesizes a **Ghost Wing** — a transient department with an auto-generated charter, backlog, and state files.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  GHOST WING LIFECYCLE                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Void detected ──▶ Infer domain ──▶ Synthesize blueprint                   │
│                                           │                                │
│                             ┌─────────────┴─────────────┐                  │
│                             ▼                           ▼                  │
│                     autoMaterialize?              await Commander           │
│                        │                          approval                 │
│                        ▼                              │                    │
│                   materialize                         ▼                    │
│                        │                         materialize               │
│                        ▼                              │                    │
│               ┌────────┴────────┐                     │                    │
│               ▼                 ▼                     │                    │
│          N successes       N failures                 │                    │
│               │                 │                     │                    │
│               ▼                 ▼                     │                    │
│           SOLIDIFY          DISSOLVE                  │                    │
│        (permanent)       (archive +                   │                    │
│                           reclaim)                    │                    │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Ghost Wings default to Commander approval before materialization (`autoMaterialize: false`). Structure becomes a biological response to the problem space.

### Phase IV — Constellation Memory

The death of flat files.

The Loom is upgraded into a spatial vector index. Every decision, every Ghost Wing outcome, every Autonomic Core correction is embedded as a coordinate in Constellation space.

When a new Sortie is declared, the Constellation is queried for **structural resonance** — retrieving tactical context from previous missions. This context is formatted as a RAG block and pre-loaded into Wing context windows before they fire thrusters.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONSTELLATION MEMORY                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Storage   :: .mesh/nervous-system/constellation/                          │
│  Index     :: index.json (embedded vectors + metadata)                     │
│  Manifest  :: manifest.json (stats, schema version)                        │
│  Ingestion :: Black Box decisions, Ghost Wing outcomes, corrections         │
│  Query     :: Cosine similarity → top-k → RAG context block               │
│                                                                            │
│  Upgrade path: LanceDB or Chroma for production-scale deployments.         │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Liquid Interface

Structure flows to fit the work. The mercury in the name is literal.

The mesh shards into specialist droplets for surgical micro-tasks. It converges into heavier strike shapes for multi-domain execution. Data and agent-logic circulate like liquid metal — never sitting, never siloed, always in motion toward the point of highest mission-impact.

Four forces hold the liquid together:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FORCE                │  FUNCTION                                          │
├───────────────────────┼────────────────────────────────────────────────────┤
│  Zero-Gravity         │  No permanent stack rank. A mission pulls the     │
│  Architecture         │  right wings into orbit until the work clears.    │
├───────────────────────┼────────────────────────────────────────────────────┤
│  The Liquid           │  The mesh shards and converges. Specialist        │
│  Interface            │  droplets for precision. Strike shapes for mass.  │
├───────────────────────┼────────────────────────────────────────────────────┤
│  The Intent           │  Commander defines trajectory and reads           │
│  Bridge               │  telemetry. The mesh handles the rest.            │
├───────────────────────┼────────────────────────────────────────────────────┤
│  The Nervous          │  Semantic gravimetry routes by intent. The        │
│  System               │  Autonomic Core breathes. Ghost Wings grow from   │
│                       │  the Void. Constellation Memory remembers.        │
└───────────────────────┴────────────────────────────────────────────────────┘
```

---

## Bridge Parameters

`config.json` is your control surface. Every flag below is a dial on the bridge console.

```text
CONFIG :: .mesh/config.json
SCHEMA :: v2
```

| Property | Type | Command Effect |
|----------|------|----------------|
| `version` | `number` | Config schema version. Current: `2`. |
| `orgMode` | `boolean` | `true` enables Wing/Deck departmental structure with leads, contracts, and cross-department routing. `false` runs the bridge as a flat team. |
| `halted` | `boolean` | **HALT Sentinel.** `true` freezes all agent spawns and write operations. |
| `allowedModels` | `string[]` | Model allowlist. Non-empty restricts all agents to listed models. Empty or absent allows all. |
| `modelRouting.default` | `string` | Default model for task-aware auto-selection when no more specific task route matches. |
| `modelRouting.taskTypes` | `object` | Category routing for task-aware auto-selection. Recommended keys: `code`, `prompts`, `docs`, `lead`, `visual`. |
| `modelRouting.fallbacks` | `object` | Ordered fallback chains used by task-aware auto-selection. Recommended keys: `premium`, `standard`, `fast`. |
| `orgConfig.autonomyMode` | `string` | `"delegated"`: bridge assigns. `"autonomous"`: wings self-select. |
| `orgConfig.crossDeptStrategy` | `string` | `"contract-first"`: formal interface contracts. `"ad-hoc"`: Airbridges on demand. |
| `orgConfig.escalationBehavior` | `string` | `"advisory"`: suggest resolution. `"blocking"`: halt until resolved. |
| `orgConfig.maxParallelismPerDepartment` | `number` | Max concurrent agent spawns per Wing/Deck. |
| `orgConfig.claimLeaseMinutes` | `number` | How long an agent holds an issue claim before it expires. |
| `orgConfig.heartbeatMinutes` | `number` | Interval at which active agents report progress. |
| `orgConfig.requeueExpiredClaims` | `boolean` | `true` returns expired claims to the backlog for reassignment. |
| `missionControl.breakWorkIntoMissions` | `boolean` | `true` forces non-trivial work to be decomposed into explicit missions before execution. |
| `missionControl.defaultRoadmapDepth` | `number` | Target number of mission checkpoints in the commander-facing Flight Path when task shape is unclear. |
| `missionControl.headerStyle` | `string` | `"ascii-art"` renders deck headers as ASCII banner text instead of plain labels. |
| `missionControl.reportStyle` | `string` | `"ascii-command-deck"` renders commander-facing reports as ASCII console panels with boxed modules and aligned telemetry streams. |
| `missionControl.showRoadmapInReplies` | `boolean` | `true` makes the Flight Path visible in commander-facing updates instead of only in logs. |
| `missionControl.telemetryCadence` | `string` | `"per-batch"` reports after each meaningful work batch. `"on-change"` only reports when the roadmap materially changes. |
| `missionControl.requiredFields` | `string[]` | Telemetry fields that must always be surfaced in updates. Recommended: `mission`, `status`, `next`, `risks`. |
| `humanTiers.tier1` | `string[]` | Full authority. Promotes agents, approves architecture, overrides any gate. |
| `humanTiers.tier2` | `string[]` | Approves routine work and review gates. Cannot promote agent lifecycle phases. |
| `humanTiers.tier3` | `string[]` | Read-only observers. No approval authority. |
| `onboarding.defaultPhase` | `string` | `"shadow"`: read-only observation. `"probation"`: execution under review. |
| `onboarding.autoPromoteThreshold` | `boolean\|number` | `false` requires Tier-1 approval. A number auto-promotes after that many successful tasks. |
| `nervousSystem.enabled` | `boolean` | `true` activates the nervous system. All four phases boot on triage. |
| `nervousSystem.embeddingProvider` | `string` | `"tfidf"`: built-in zero-dependency vectorizer. `"openrouter"`: OpenRouter embeddings API. `"llm"`: legacy OpenAI-compatible alias. |
| `nervousSystem.embeddingApiKey` | `string\|null` | Preferred in `.mesh/local.json` for dependency installs. Used by `"openrouter"` and legacy `"llm"` providers. |
| `nervousSystem.embeddingModel` | `string\|null` | Optional model override. Defaults by provider: OpenRouter uses `openai/text-embedding-3-small`; legacy `llm` uses `text-embedding-3-small`. |
| `nervousSystem.embeddingEndpoint` | `string\|null` | Optional endpoint override. Defaults by provider. OpenRouter default: `https://openrouter.ai/api/v1/embeddings`. |
| `nervousSystem.embeddingAppName` | `string\|null` | Optional OpenRouter attribution title. Sent as `X-OpenRouter-Title`. Default: `Mercury Mesh`. |
| `nervousSystem.embeddingAppUrl` | `string\|null` | Optional OpenRouter attribution URL. Sent as `HTTP-Referer` when set. |
| `nervousSystem.gravimetry.minimumGravity` | `number` | Minimum cosine similarity for a Wing to exert any pull. Default: `0.15`. |
| `nervousSystem.gravimetry.airbridgeThreshold` | `number` | If top Wing gravity share ≥ this, route directly. Below triggers Airbridge. Default: `0.70`. |
| `nervousSystem.gravimetry.airbridgeMinShare` | `number` | Minimum gravity share for a Wing to join an Airbridge. Default: `0.20`. |
| `nervousSystem.autonomic.pulseMs` | `number` | Metabolism pulse interval in milliseconds. Default: `30000`. |
| `nervousSystem.autonomic.contextDecayMinutes` | `number` | Minutes before untouched state files are flagged as decayed. Default: `60`. |
| `nervousSystem.autonomic.applyCorrections` | `boolean` | `true` writes corrections (lease requeue, decisions). `false` is read-only. |
| `nervousSystem.ghostWings.enabled` | `boolean` | `true` enables Ghost Wing synthesis when Sorties fall into the Void. |
| `nervousSystem.ghostWings.autoMaterialize` | `boolean` | `true` materializes Ghost Wings without Commander approval. Default: `false`. |
| `nervousSystem.ghostWings.solidificationThreshold` | `number` | Successful tasks before a Ghost Wing becomes permanent. Default: `3`. |
| `nervousSystem.ghostWings.dissolutionThreshold` | `number` | Failed tasks before a Ghost Wing is dissolved. Default: `2`. |
| `nervousSystem.ghostWings.maxLifespanHours` | `number` | Maximum hours a Ghost Wing can exist before forced dissolution. Default: `72`. |
| `nervousSystem.constellation.enabled` | `boolean` | `true` activates spatial vector memory and RAG context. |
| `nervousSystem.constellation.ragMaxEntries` | `number` | Maximum Constellation entries returned per RAG query. Default: `5`. |
| `nervousSystem.constellation.ragMinSimilarity` | `number` | Minimum similarity for a Constellation entry to appear in RAG. Default: `0.15`. |

Recommended for a commander who wants continuous status visibility:

```json
"missionControl": {
  "breakWorkIntoMissions": true,
  "defaultRoadmapDepth": 4,
  "headerStyle": "ascii-art",
  "reportStyle": "ascii-command-deck",
  "showRoadmapInReplies": true,
  "telemetryCadence": "per-batch",
  "requiredFields": ["mission", "status", "next", "risks"]
}
```

---

## Signal Translation

The mesh speaks its own physics. Every surface, every conversation, every commit message uses this lexicon. The bridge stays clearer when the whole organism shares one language.

```text
┌─────────────────────┬────────────────────┬──────────────────────────────────┐
│  STANDARD SIGNAL    │  MESH TERM         │  FUNCTION                        │
├─────────────────────┼────────────────────┼──────────────────────────────────┤
│  Department         │  Wing / Deck       │  Domain-scoped execution group   │
│  Project            │  Mission / Sortie  │  Deployment into a problem space │
│  Project Lead       │  Mission Prime     │  Local lead of a gravity well    │
│  Documentation      │  The Black Box     │  Immutable decision ledger       │
│  Roadmap            │  The Flight Path   │  Long-range strategic direction  │
│  Task Status        │  Telemetry         │  Live HUD readout of progress    │
│  Alignment State    │  The Drift         │  Deviation from mission vector   │
│  Sprint             │  The Burn          │  High-intensity execution period │
│  Project Health     │  Hull Integrity    │  Quality and structural health   │
│  Unknown Territory  │  The Void          │  Uncharted problem-space ahead   │
│  Cross-Team Sync    │  Airbridge         │  Temporary wing-to-wing link     │
│  Knowledge Base     │  The Loom          │  Shared knowledge fabric         │
│  Routing Engine     │  Gravimetry        │  Semantic intent-to-Wing mapping │
│  Gravity Score      │  Gravity Field     │  Spatial pull of a Sortie on     │
│                     │                    │  all Wings simultaneously        │
│  Health Monitor     │  Autonomic Core    │  Persistent metabolism + drift   │
│                     │                    │  correction loop                 │
│  Temporary Team     │  Ghost Wing        │  Emergent department from the    │
│                     │                    │  Void — solidifies or dissolves  │
│  Memory Index       │  Constellation     │  Spatial vector memory of every  │
│                     │  Memory            │  decision and outcome            │
│  Context Injection  │  RAG Context       │  Pre-loaded historical resonance │
│                     │                    │  from the Constellation          │
│  Internal Clock     │  Pulse             │  One metabolism cycle of the     │
│                     │                    │  Autonomic Core                  │
│  State Check        │  Drift Weather     │  Full sensor sweep of all Wing   │
│                     │                    │  state files in one pulse        │
└─────────────────────┴────────────────────┴──────────────────────────────────┘
```

---

## Vocal Signatures

Three voices operate on this bridge. Each has a purpose. Each has a frequency.

```text
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  VOICE              │  CHARACTER                                           │
├─────────────────────┼──────────────────────────────────────────────────────┤
│  Ship's Computer    │  Analytical. Objective. Slightly cold. The voice of │
│                     │  coordination — measured, exact, austere.            │
├─────────────────────┼──────────────────────────────────────────────────────┤
│  Tactical Officer   │  Brief. Urgent. Mission-forward. The voice of       │
│                     │  routing, triage, and escalation.                    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│  Specialist         │  Focused. Adaptive. Immersed. The voice of          │
│                     │  research, making, and iteration.                    │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Bridge Protocols

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROTOCOL STATUS                                                           │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  HALT SENTINEL       │  ARMED — freezes all spawns and writes on trigger.  │
│  SHADOWING PHASE     │  AVAILABLE — new agents observe before firing       │
│                      │  thrusters.                                         │
│  THE LOOM            │  ACTIVE — one wing learns, the whole mesh knows.    │
│  AIRBRIDGE           │  READY — temporary link between autonomous wings.   │
│  BLACK BOX           │  RECORDING — immutable. Every decision. Every       │
│                      │  correction. Every lesson.                          │
│  GRAVIMETRY          │  ONLINE — semantic routing replaces keyword         │
│                      │  matching. TF-IDF or LLM embeddings.               │
│  AUTONOMIC CORE      │  ONLINE — persistent metabolism. Drift weather      │
│                      │  scanning, lease patrol, heartbeat monitoring.      │
│  GHOST WING          │  ARMED — Void detection triggers emergent           │
│  SYNTHESIS           │  topology. Commander approval required.             │
│  CONSTELLATION       │  ONLINE — spatial vector memory. RAG context        │
│  MEMORY              │  pre-loaded into Wing context windows.              │
├──────────────────────┴──────────────────────────────────────────────────────┤
│  All protocols nominal. Nervous system online. Bridge is live.             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Black Box

Everything the bridge learns is recorded here. Short. Sharp. Operational.

- [docs/commander-onboarding.md](docs/commander-onboarding.md) — First Light. The full onboarding sequence from cold hull to live mission.
- [docs/brand-language.md](docs/brand-language.md) — Voice, vocabulary, and messaging physics.
- [docs/mercury-mesh-runtime-rename-impact.md](docs/mercury-mesh-runtime-rename-impact.md) — Runtime rename history and compatibility surface.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ARCHIVE CHANNELS                                                          │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  PRIMARY RUNTIME     │  .mesh/                                             │
│  ALT CHECK           │  .mercury/                                          │
│  DECISION LEDGER     │  .mesh/decisions.md                                 │
│  FLIGHT PATH         │  .mesh/manifesto.md                                 │
│  NERVOUS SYSTEM      │  .mesh/nervous-system/                              │
│  CONSTELLATION       │  .mesh/nervous-system/constellation/                │
├──────────────────────┴──────────────────────────────────────────────────────┤
│  Helpers resolve .mesh/ first. .mercury/ as fallback.                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
