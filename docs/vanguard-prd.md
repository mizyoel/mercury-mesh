```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ██╗   ██╗ █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗   ║
║   ██║   ██║██╔══██╗████╗  ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗  ║
║   ██║   ██║███████║██╔██╗ ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║  ║
║   ╚██╗ ██╔╝██╔══██║██║╚██╗██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║  ║
║    ╚████╔╝ ██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝  ║
║     ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝   ║
║                                                                            ║
║    P R O D U C T   R E Q U I R E M E N T S   D O C U M E N T             ║
║    The Autonomous Innovation Subsystem                                     ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSMISSION                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TO       :: COMMANDER                                                     │
│  FROM     :: SHIP'S COMPUTER                                               │
│  RE       :: THE VANGUARD — AUTONOMOUS INNOVATION SUBSYSTEM PRD            │
│  CLASS    :: ARCHITECTURE / PHASE 2 ROADMAP                                │
│  PRIORITY :: STRATEGIC                                                     │
│  VERSION  :: 0.1.0-draft                                                   │
│  DATE     :: 2026-04-05                                                    │
│                                                                            │
│  The Mesh can repair itself. It cannot yet evolve itself.                  │
│  This document changes that.                                               │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Strategic Context](#3-strategic-context)
4. [Subsystem Overview](#4-subsystem-overview)
5. [Architecture](#5-architecture)
6. [Component Specifications](#6-component-specifications)
   - 6.1 [The Outrider](#61-the-outrider)
   - 6.2 [The Skunkworks](#62-the-skunkworks)
   - 6.3 [Skill Synthesis](#63-skill-synthesis)
   - 6.4 [R&D Wing](#64-rd-wing)
   - 6.5 [Genesis Protocols](#65-genesis-protocols)
   - 6.6 [Horizon Deck](#66-horizon-deck)
   - 6.7 [Speculative Sortie](#67-speculative-sortie)
7. [Authority Model](#7-authority-model)
8. [Data Model & Storage](#8-data-model--storage)
9. [Configuration Schema](#9-configuration-schema)
10. [Integration Points](#10-integration-points)
11. [CLI Surface](#11-cli-surface)
12. [Telemetry & Observability](#12-telemetry--observability)
13. [Resource Containment](#13-resource-containment)
14. [Failure Taxonomy](#14-failure-taxonomy)
15. [Security & Safety](#15-security--safety)
16. [Rollout Phases](#16-rollout-phases)
17. [Success Criteria](#17-success-criteria)
18. [Open Questions](#18-open-questions)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRIEF                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  The Vanguard is the evolutionary subsystem of Mercury Mesh.               │
│                                                                            │
│  Ghost Wings are the immune system — they detect gaps in the current       │
│  formation and fill them. The Vanguard is the evolutionary drive — it      │
│  detects territory the formation has never occupied and extends into it.   │
│                                                                            │
│  Where Ghost Wings are reactive, the Vanguard is proactive.               │
│  Where Ghost Wings repair, the Vanguard expands.                          │
│  Where Ghost Wings are short-lived, the Vanguard builds permanent mass.   │
│                                                                            │
│  The Vanguard enables Mercury Mesh to autonomously discover adjacent      │
│  problem spaces, prototype new capabilities in quarantined R&D foundries, │
│  synthesize new skills, and — with Commander authorization — permanently  │
│  integrate successful innovations into the operational roster.            │
│                                                                            │
│  Nothing crosses from prototype to production without the Commander       │
│  explicitly taking the chair.                                             │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Problem Statement

### The Ceiling

Mercury Mesh 1.0 is structurally complete. The nervous system routes, heals, remembers, and adapts. Ghost Wings fill gaps. The Autonomic Core breathes. Constellation Memory preserves institutional intelligence. The hull is live and the formation holds.

But the Mesh cannot grow beyond its initial topology without direct Commander intervention. Every new capability, every new domain, every new skill must be conceived, designed, and injected by a human operator. The Mesh can react to *what the Commander has already imagined* — it cannot yet reach for *what the Commander has not*.

### The Cost

This ceiling manifests as:

| Symptom | Impact |
|---------|--------|
| **Stagnant skill coverage** | The Mesh handles only domains it was explicitly taught. Novel problem spaces bounce off the hull as unroutable Void signals. |
| **Manual roadmap burden** | Every innovation trajectory requires Commander time for ideation, prototyping, validation, and integration — time that should be spent on strategic command, not incremental expansion. |
| **Wasted Void signal** | When a Sortie falls into the Void, the Ghost Wing patches the gap for *that specific Sortie*. But the systemic insight — "this domain is emerging, and we should expand into it proactively" — is lost after the Ghost dissolves. |
| **No speculative execution** | The Mesh never initiates. It only responds. Idle capacity goes unused. Adjacent opportunities go unexplored. The mesh waits. |

### The Threshold

The Vanguard transforms the Mesh from a *responsive operating system* into a *self-expanding organism*. The hull grows not just by surviving, but by reaching.

---

## 3. Strategic Context

### Relationship to Existing Subsystems

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  NERVOUS SYSTEM EVOLUTION                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Phase I    Semantic Gravimetry       PERCEPTION      [1.0 — SHIPPED]     │
│  Phase II   Autonomic Core            METABOLISM      [1.0 — SHIPPED]     │
│  Phase III  Ghost Wings               IMMUNE SYSTEM   [1.0 — SHIPPED]     │
│  Phase IV   Constellation Memory      MEMORY          [1.0 — SHIPPED]     │
│  Phase V    THE VANGUARD              EVOLUTION       [2.0 — THIS PRD]    │
│                                                                            │
│  The Vanguard is Phase V of the Nervous System — the culmination of       │
│  every subsystem that came before it, pointed forward instead of inward.  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lore Alignment

The Genesis narrative foreshadows the Vanguard directly:

> *"The signal propagates back through the membrane into the Liquid Cartography. The graveyard of failed intent is slowly beginning to move again."*

The Vanguard is the Mesh deliberately tapping back into the Cartography — not waiting for signals to arrive, but sending Outriders into the Void to prospect for trajectories the Commander has not yet imagined. It closes the loop between the Mesh's origin story and its operational future. The Cartography woke the Mesh. Now the Mesh explores the Cartography on its own.

---

## 4. Subsystem Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE VANGUARD — COMPONENT MAP                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                          ┌──────────────┐                                  │
│                          │   OUTRIDER   │ ← Scans the Void                │
│                          │  (Explorer)  │                                  │
│                          └──────┬───────┘                                  │
│                                 │                                          │
│                                 ▼                                          │
│                   ┌─────────────────────────┐                              │
│                   │      THE SKUNKWORKS     │ ← Quarantined R&D            │
│                   │    (Prototype Foundry)   │                              │
│                   └───┬──────────┬──────────┘                              │
│                       │          │                                          │
│              ┌────────▼──┐  ┌───▼──────────┐                               │
│              │  R&D WING │  │    SKILL     │                               │
│              │ (PoC Team)│  │  SYNTHESIS   │                               │
│              └────────┬──┘  └───┬──────────┘                               │
│                       │         │                                           │
│                       ▼         ▼                                           │
│              ┌─────────────────────────────┐                               │
│              │      HORIZON DECK           │ ← Staging & Review            │
│              │  (Awaiting Authorization)   │                               │
│              └─────────────┬───────────────┘                               │
│                            │                                               │
│                    ┌───────▼───────┐                                       │
│                    │    GENESIS    │ ← Permanent Integration               │
│                    │   PROTOCOLS   │                                       │
│                    └───────────────┘                                       │
│                                                                            │
│  Speculative Sorties flow through the entire pipeline top-to-bottom.      │
│  Commander authority gates are marked with ◆ in the detailed specs.       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component | Role | Analogy |
|-----------|------|---------|
| **The Vanguard** | The containing subsystem. The evolutionary drive. | The organism's will to grow. |
| **Outrider** | Pioneer agent. Scans the Void for adjacent architectures, untamed problem spaces, and new feature trajectories. | A scouting vessel sent ahead of the fleet. |
| **The Skunkworks** | Quarantined R&D foundry. Prototypes uncharted ideas in sandboxed isolation before they touch the main hull. | A classified shipyard below decks. |
| **Skill Synthesis** | Autonomous generation of `.skill` files. Teaches the system new capabilities for novel domains. | Forging a new tool in the armory. |
| **R&D Wing** | Emergent Ghost Wing subtype deployed exclusively inside the Skunkworks to build Proof of Concepts. | An experimental crew assembled for a single prototype. |
| **Genesis Protocols** | Framework for permanently incorporating successful R&D outcomes into the standard operational roster. | The ceremony where a Ghost Wing earns its hull plating. |
| **Horizon Deck** | Staging area for autonomously generated roadmap items, tested capabilities, and successful prototypes awaiting Commander authorization. | The flight deck where prototypes are parked before launch clearance. |
| **Speculative Sortie** | An experimental feature draft and execution plan synthesized by the Mesh to drive continuous, unprompted development. | A mission the ship proposes to its Commander. |

---

## 5. Architecture

### 5.1 File System Layout

```text
.mesh/
├── nervous-system/
│   ├── index.js                     # Existing — boots all phases
│   ├── semantic-gravimetry.js       # Phase I  — routing
│   ├── autonomic-core.js            # Phase II — metabolism
│   ├── ghost-wing.js                # Phase III — reactive
│   ├── constellation-memory.js      # Phase IV — memory
│   ├── vanguard/                    # Phase V  — THIS SUBSYSTEM
│   │   ├── index.js                 # Vanguard orchestrator
│   │   ├── outrider.js              # Void scanning engine
│   │   ├── skunkworks.js            # R&D foundry lifecycle
│   │   ├── skill-synthesis.js       # Autonomous skill generation
│   │   ├── rd-wing.js               # R&D Wing factory (Ghost Wing subtype)
│   │   ├── genesis-protocols.js     # Integration pipeline
│   │   ├── horizon-deck.js          # Staging area manager
│   │   └── speculative-sortie.js    # Sortie generation engine
│   └── constellation/               # Existing — vector store
├── vanguard/                        # Runtime state (like org/)
│   ├── manifest.json                # Vanguard operational state
│   ├── outrider/
│   │   ├── scan-log.json            # History of Outrider scans
│   │   └── adjacency-map.json       # Discovered adjacent domains
│   ├── skunkworks/
│   │   ├── registry.json            # Active experiments
│   │   └── {experiment-id}/         # Per-experiment workspace
│   │       ├── hypothesis.json      # What the experiment tests
│   │       ├── rd-wing.json         # R&D Wing blueprint
│   │       ├── backlog.md           # Experiment tasks
│   │       ├── results.json         # Outcome data
│   │       └── skills/              # Synthesized skill drafts
│   └── horizon-deck/
│       ├── queue.json               # Items staged for review
│       └── {item-id}.json           # Individual proposal details
└── config.json                      # Existing — gains `vanguard` key
```

### 5.2 Module Dependency Graph

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  MODULE DEPENDENCIES                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  vanguard/index.js                                                        │
│    ├── outrider.js                                                        │
│    │     ├── constellation-memory.js   (query sparse zones)               │
│    │     └── semantic-gravimetry.js    (embed adjacency probes)           │
│    ├── skunkworks.js                                                      │
│    │     ├── rd-wing.js                                                   │
│    │     │     └── ghost-wing.js       (subtype factory)                  │
│    │     ├── skill-synthesis.js                                           │
│    │     └── worktree-manager.js       (isolated branches)               │
│    ├── horizon-deck.js                                                    │
│    │     └── constellation-memory.js   (store outcomes)                   │
│    ├── genesis-protocols.js                                               │
│    │     ├── ghost-wing.js             (solidification path)              │
│    │     └── constellation-memory.js   (record integration)              │
│    └── speculative-sortie.js                                              │
│          ├── outrider.js               (adjacency data)                   │
│          └── constellation-memory.js   (historical patterns)             │
│                                                                            │
│  External:                                                                │
│    autonomic-core.js  →  pulses vanguard.tick() on configurable cadence   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Design Principles

1. **Zero new external dependencies.** Like every other nervous system phase, the Vanguard ships with zero npm dependencies. LLM providers are optional and use the existing embedding/provider interface.

2. **Commander sovereignty is absolute.** The Outrider explores autonomously. The Skunkworks builds autonomously. But nothing enters the operational roster without explicit Commander authorization through a Genesis Protocol gate. The Event Horizon state applies.

3. **Failure is institutional memory.** Every dissolved R&D Wing, every rejected Speculative Sortie, every synthesis that produced an unusable skill — all of it feeds back into Constellation Memory. The Liquid Cartography was forged from the residual energy of failed organizations. The Vanguard's failures enrich the Mesh the same way.

4. **Quarantine by default.** Skunkworks experiments operate in isolated git worktrees under a `mesh/skunkworks/` namespace. They cannot mutate the main hull. They cannot access operational Wing state. They are structurally walled off until Genesis integrates them.

5. **Resource-bounded autonomy.** Hard limits on concurrent experiments, token budgets, and time-to-live prevent runaway compute. The Mesh may innovate, but it may not burn down the ship doing it.

---

## 6. Component Specifications

### 6.1 The Outrider

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  OUTRIDER — VOID CARTOGRAPHER                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Explore the Void to discover adjacent architectures,         │
│              untamed problem spaces, and new feature trajectories.         │
│  TRIGGER  :: Autonomic Core pulse (configurable interval)                 │
│  OUTPUT   :: Adjacency Map — scored list of expansion candidates          │
│  AUTHORITY :: Fully autonomous. No Commander approval for scanning.       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.1.1 What the Outrider Scans

The Outrider perception model operates across four signal channels:

| Channel | Source | Signal |
|---------|--------|--------|
| **Constellation Sparse Zones** | `constellation-memory.js` | Regions of the embedding space with low entry density. These are domains the Mesh has encountered but not built institutional competence in. The inverse of expertise — the shadows between the stars. |
| **Ghost Wing Residue** | `.mesh/org/ghost-*/ghost-meta.json` | Dissolved Ghost Wings leave behind domain signatures, failure reasons, and partial-attractor data. Clusters of dissolved Ghosts in the same domain indicate a systemic capability gap, not a one-off routing miss. |
| **Commander Pattern Analysis** | Constellation entries typed `decision`, `burn` | Historical mission patterns. What domains does the Commander repeatedly engage? What adjacent domains are *never* touched but sit close in embedding space? The Outrider infers latent demand from the negative space around past missions. |
| **Void Frequency Log** | Gravimetry routing misses | Sorties that fell into the Void and were not caught by Ghost Wings. Persistent Void hits in a specific semantic region indicate an emerging domain the Mesh should proactively claim. |

#### 6.1.2 Adjacency Scoring

Each discovered domain candidate is scored across four dimensions:

```text
adjacencyScore = (
    sparseZoneSignal   * 0.30    // How empty is this constellation region?
  + ghostResidueSignal * 0.25    // How many Ghosts dissolved in this area?
  + patternProximity   * 0.25    // How close to Commander's historical patterns?
  + voidFrequency      * 0.20    // How often do Sorties miss here?
)
```

Candidates scoring above `outrider.minimumAdjacencyScore` (default: `0.40`) are written to the **Adjacency Map** and become eligible for Speculative Sortie generation.

#### 6.1.3 Adjacency Map Schema

```jsonc
// .mesh/vanguard/outrider/adjacency-map.json
{
  "schemaVersion": 1,
  "lastScan": "2026-04-05T14:30:00Z",
  "candidates": [
    {
      "id": "adj-a1b2c3d4",
      "domain": ["graphql", "schema", "federation"],
      "inferredFrom": {
        "sparseZone": { "centroid": [0.12, -0.34, ...], "density": 0.03 },
        "ghostResidue": ["ghost-e5f6a7b8", "ghost-c9d0e1f2"],
        "voidHits": 7,
        "nearestConstellationEntries": ["entry-id-1", "entry-id-2"]
      },
      "score": 0.67,
      "signals": {
        "sparseZone": 0.82,
        "ghostResidue": 0.60,
        "patternProximity": 0.55,
        "voidFrequency": 0.71
      },
      "status": "discovered",  // discovered | investigating | promoted | dismissed
      "discoveredAt": "2026-04-05T14:30:00Z",
      "promotedToExperiment": null
    }
  ]
}
```

#### 6.1.4 Scan Lifecycle

```text
  Autonomic Core pulse
         │
         ▼
  Check: vanguard.outrider.enabled?
         │
         ▼
  Check: Time since last scan ≥ scanIntervalHours?
         │
         ▼
  Query Constellation for sparse zones
         │
         ▼
  Scan Ghost Wing graveyard for residue clusters
         │
         ▼
  Analyze Commander mission patterns for negative space
         │
         ▼
  Aggregate Void frequency from Gravimetry logs
         │
         ▼
  Score candidates → filter by minimumAdjacencyScore
         │
         ▼
  Deduplicate against existing Adjacency Map entries
         │
         ▼
  Write updated adjacency-map.json
         │
         ▼
  Emit constellation entry: type = 'outrider-scan'
         │
         ▼
  If any new candidates: emit event 'vanguard:adjacency-discovered'
```

---

### 6.2 The Skunkworks

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE SKUNKWORKS — QUARANTINED R&D FOUNDRY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Prototype uncharted ideas in isolation. Train new             │
│              specialist agents. Form experimental teams.                   │
│  TRIGGER  :: Speculative Sortie approval or Commander direct request       │
│  OUTPUT   :: Validated prototypes, synthesized skills, R&D Wing reports    │
│  AUTHORITY :: Auto-approved within quarantine. Cannot touch main hull.     │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.1 Quarantine Model

The Skunkworks operates in complete structural isolation from the operational Mesh:

| Boundary | Enforcement |
|----------|-------------|
| **Git isolation** | Each experiment runs in a dedicated worktree under `mesh/skunkworks/{experiment-id}` namespace. Managed by `worktree-manager.js`. |
| **File system isolation** | Experiment state lives in `.mesh/vanguard/skunkworks/{experiment-id}/`, not in `.mesh/org/`. |
| **Routing isolation** | R&D Wings are not registered in `structure.json`. Semantic Gravimetry does not route operational Sorties to Skunkworks experiments. |
| **Authority isolation** | R&D Wings have `autonomyMode: "sandboxed"`. They can make local implementation decisions but cannot escalate to, request Airbridges with, or modify operational Wings. |
| **Resource isolation** | Hard budget caps per experiment (tokens, time, concurrent agents). Enforced by `skunkworks.js`. |

#### 6.2.2 Experiment Lifecycle

```text
  ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌────────────┐
  │  DRAFTED  │ ──▶ │  ACTIVE   │ ──▶ │  REVIEW   │ ──▶ │  PROMOTED  │
  └───────────┘     └───────────┘     └───────────┘     └────────────┘
                          │                                    │
                          │           ┌───────────┐            │
                          └─────────▶ │ DISSOLVED │            ▼
                                      └───────────┘     Horizon Deck
```

| State | Description |
|-------|-------------|
| `drafted` | Hypothesis and backlog formed. Worktree not yet created. |
| `active` | Worktree live. R&D Wing materialized. Execution in progress. |
| `review` | Execution complete. Results collected. Awaiting evaluation against hypothesis. |
| `promoted` | Results passed evaluation. Artifacts staged to Horizon Deck. |
| `dissolved` | Experiment failed evaluation or exceeded time-to-live. Archived to Constellation. |

#### 6.2.3 Experiment Schema

```jsonc
// .mesh/vanguard/skunkworks/{experiment-id}/hypothesis.json
{
  "schemaVersion": 1,
  "id": "exp-a1b2c3d4",
  "title": "GraphQL Federation Routing",
  "origin": {
    "type": "speculative-sortie",  // or "commander-directed"
    "sourceId": "sortie-e5f6a7b8",
    "adjacencyCandidate": "adj-a1b2c3d4"
  },
  "hypothesis": "The Mesh can route GraphQL federation subgraph requests through Semantic Gravimetry using schema-derived embeddings.",
  "successCriteria": [
    "Gravimetry produces >0.60 similarity for GraphQL routing keywords",
    "Synthesized skill passes self-test validation",
    "R&D Wing completes all backlog items within token budget"
  ],
  "domain": ["graphql", "schema", "federation"],
  "status": "active",
  "createdAt": "2026-04-05T15:00:00Z",
  "worktree": {
    "branch": "mesh/skunkworks/exp-a1b2c3d4",
    "path": "/projects/mesh-exp-a1b2c3d4"
  },
  "budget": {
    "maxTokens": 50000,
    "tokensUsed": 12400,
    "maxLifespanHours": 168,
    "elapsedHours": 4.2,
    "maxAgents": 2
  },
  "rdWingId": "rd-wing-f9e8d7c6",
  "results": null
}
```

#### 6.2.4 Skunkworks Registry

```jsonc
// .mesh/vanguard/skunkworks/registry.json
{
  "schemaVersion": 1,
  "maxConcurrentExperiments": 2,
  "active": ["exp-a1b2c3d4"],
  "completed": [],
  "dissolved": [],
  "totalTokensBurned": 12400,
  "totalExperimentsRun": 1
}
```

---

### 6.3 Skill Synthesis

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  SKILL SYNTHESIS — AUTONOMOUS CAPABILITY GENERATION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Autonomously generate new .skill files, teaching the          │
│              system how to handle novel domains.                           │
│  TRIGGER  :: R&D Wing execution within Skunkworks                         │
│  OUTPUT   :: Draft .skill files in experiment workspace                    │
│  AUTHORITY :: Draft generation is autonomous. Usage requires Genesis.      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.3.1 Synthesis Pipeline

Skill Synthesis extends the existing `create-skill` pipeline with autonomous invocation:

```text
  R&D Wing identifies novel domain patterns during prototype execution
         │
         ▼
  Extract domain context:
    - Keywords from Outrider adjacency data
    - Patterns observed during prototype execution
    - Anti-patterns from dissolved Ghost Wing residue
    - Code examples from Skunkworks worktree artifacts
         │
         ▼
  Generate skill draft using .mesh/templates/skill.md scaffold:
    - name:        derived from domain keywords
    - description: synthesized from hypothesis + results
    - domain:      from adjacency candidate
    - confidence:  always "low" on first synthesis
    - source:      "synthesized"
    - Patterns:    extracted from prototype code
    - Anti-patterns: extracted from failure data
         │
         ▼
  Write draft to .mesh/vanguard/skunkworks/{experiment-id}/skills/
         │
         ▼
  Self-test: attempt to route a synthetic Sortie using the new skill's
  keywords through Gravimetry. If routing fails → flag for revision.
         │
         ▼
  If experiment promoted → skills move to Horizon Deck
```

#### 6.3.2 Synthesized Skill Metadata Extension

Skills generated by Skill Synthesis carry additional provenance metadata:

```markdown
---
name: "graphql-federation-routing"
description: "Routes GraphQL federation subgraph requests through schema-derived embeddings"
domain: "graphql, api-design, schema"
confidence: "low"
source: "synthesized"
synthesisProvenance:
  experimentId: "exp-a1b2c3d4"
  outriderCandidate: "adj-a1b2c3d4"
  rdWingId: "rd-wing-f9e8d7c6"
  synthesizedAt: "2026-04-05T18:30:00Z"
  selfTestResult: "pass"
  constellationEntryId: "cst-b3c4d5e6"
tools: []
---
```

#### 6.3.3 Confidence Ladder

Synthesized skills start at `low` confidence and are promoted through usage:

| Confidence | Criteria | Routing Weight |
|------------|----------|----------------|
| `low` | Fresh from synthesis. Self-test passed. | 0.5x standard gravity (reduced influence on Gravimetry routing) |
| `medium` | Promoted via Genesis. Commander has seen it. Used successfully in ≥ 3 operational Sorties. | 1.0x standard gravity |
| `high` | Commander has explicitly endorsed. Used successfully in ≥ 10 Sorties with zero reversions. | 1.2x standard gravity (boosted influence) |

---

### 6.4 R&D Wing

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  R&D WING — EXPERIMENTAL GHOST WING SUBTYPE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Build Proof of Concepts inside the Skunkworks. Test both     │
│              new code and new collaborative team structures.               │
│  TRIGGER  :: Skunkworks experiment activation                             │
│  OUTPUT   :: Prototype code, skill drafts, team-structure findings        │
│  AUTHORITY :: Operates under sandboxed autonomy within quarantine.        │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.1 Ghost Wing Subtype

R&D Wings are Ghost Wings with modified lifecycle parameters:

| Parameter | Ghost Wing (Standard) | R&D Wing |
|-----------|----------------------|----------|
| `lifecycle` | `"ghost"` | `"rd-experimental"` |
| `maxLifespanHours` | 72 (3 days) | 168 (7 days) — configurable up to 336 (14 days) |
| `solidificationThreshold` | 3 successes | N/A — R&D Wings do not solidify directly. They promote through Genesis. |
| `dissolutionThreshold` | 2 failures | Budget exhaustion or time-to-live expiry. Failure count is recorded but does not trigger auto-dissolution. |
| `autonomyMode` | `"delegated"` | `"sandboxed"` |
| `maxParallelism` | 2 | Configurable per experiment (default: 2) |
| `routingVisibility` | Registered in `structure.json` | **Not** registered. Invisible to Gravimetry. |
| `worktreeNamespace` | `mesh/{issue}-{slug}` | `mesh/skunkworks/{experiment-id}` |

#### 6.4.2 R&D Wing Blueprint Extension

```jsonc
{
  "id": "rd-wing-f9e8d7c6",
  "name": "GraphQL Federation R&D Wing",
  "lifecycle": "rd-experimental",
  "parentExperiment": "exp-a1b2c3d4",
  "synthesizedAt": "2026-04-05T15:05:00Z",
  "synthesizedFrom": {
    "adjacencyCandidate": "adj-a1b2c3d4",
    "hypothesis": "GraphQL federation routing via schema embeddings"
  },
  "domain": ["graphql", "schema", "federation"],
  "routingKeywords": ["graphql", "federation", "subgraph", "schema", "resolver"],
  "lead": "{uncast}",
  "members": [],
  "authority": {
    "canDecideLocally": [
      "prototype implementation approach",
      "test strategy within experiment scope",
      "skill draft content and structure"
    ],
    "mustEscalate": [
      "exceeding token budget",
      "requesting operational Wing data",
      "modifying any file outside Skunkworks worktree"
    ]
  },
  "runtime": {
    "autonomyMode": "sandboxed",
    "maxParallelism": 2,
    "claimLeaseMinutes": 20,
    "heartbeatMinutes": 10
  },
  "results": {
    "artifactsProduced": [],
    "skillsSynthesized": [],
    "teamStructureNotes": "",
    "executionLog": []
  }
}
```

#### 6.4.3 Team Structure Experimentation

R&D Wings are not just code factories. They also serve as test beds for **collaborative structures**. Each R&D Wing can experiment with:

- **Lead style variations** — player-coach, delegator, or rotating lead
- **Agent composition** — specialist-heavy vs. generalist teams
- **Communication patterns** — Airbridge frequency, handoff protocols
- **Parallelism models** — serial task chains vs. parallel exploration

Team structure findings are captured in `results.teamStructureNotes` and become part of the Constellation Memory entry when the experiment completes. This enables the Mesh to learn not just *what* to build, but *how to organize itself* to build it.

---

### 6.5 Genesis Protocols

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  GENESIS PROTOCOLS — PERMANENT INTEGRATION FRAMEWORK                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ◆ PURPOSE  :: Permanently incorporate successful R&D agents, teams,      │
│                and skills into the standard operational roster.            │
│  ◆ TRIGGER  :: Commander authorization from Horizon Deck                  │
│  ◆ OUTPUT   :: New permanent Wings, skills, and routing rules             │
│  ◆ AUTHORITY :: EVENT HORIZON. Full Tier-1 Commander authorization.       │
│                                                                            │
│  ◆ = Commander authority gate                                             │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.5.1 Genesis Pipeline

Genesis transforms prototype artifacts into operational topology. It is a multi-stage pipeline with explicit checkpoints:

```text
  ┌─────────────────────────────────────────────────────────────────────┐
  │  STAGE 1: VALIDATION                                                │
  │                                                                     │
  │  - Verify all success criteria from hypothesis.json are met         │
  │  - Verify synthesized skills pass self-test                         │
  │  - Verify no budget overruns or containment breaches                │
  │  - Compute integration impact: which existing Wings are affected?   │
  │  - Generate Genesis Proposal document                               │
  └────────────────────────────┬────────────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────────────┐
  │  STAGE 2: STAGING (Horizon Deck)                                    │
  │                                                                     │
  │  - Package proposal + artifacts into Horizon Deck queue             │
  │  - Notify Commander via telemetry event                             │
  │  - Wait for authorization (no timeout — human decision)             │
  └────────────────────────────┬────────────────────────────────────────┘
                               │
                        ◆ COMMANDER AUTHORIZES ◆
                               │
  ┌────────────────────────────▼────────────────────────────────────────┐
  │  STAGE 3: INTEGRATION                                               │
  │                                                                     │
  │  - Register new Wing in structure.json (lifecycle: "permanent")     │
  │  - Install synthesized skills to .copilot/skills/ and               │
  │    .mesh/templates/skills/ (kept in sync per brand-notes)           │
  │  - Merge Skunkworks worktree into target branch                     │
  │  - Update routing.md with new Wing's gravity signature              │
  │  - Update Constellation Memory with full Genesis record             │
  └────────────────────────────┬────────────────────────────────────────┘
                               │
  ┌────────────────────────────▼────────────────────────────────────────┐
  │  STAGE 4: COOLDOWN                                                  │
  │                                                                     │
  │  - Integration cooldown period (default: 48 hours)                  │
  │  - Monitor newly integrated Wing for drift or routing conflicts     │
  │  - If anomalies detected: auto-alert Commander, do NOT auto-revert │
  │  - After cooldown: mark Genesis complete                            │
  └─────────────────────────────────────────────────────────────────────┘
```

#### 6.5.2 Genesis Proposal Schema

```jsonc
// Generated by genesis-protocols.js, stored in Horizon Deck
{
  "schemaVersion": 1,
  "id": "genesis-a1b2c3d4",
  "experimentId": "exp-a1b2c3d4",
  "title": "Integrate GraphQL Federation Routing",
  "summary": "R&D Wing successfully demonstrated schema-derived embedding routing for GraphQL federation subgraphs. Synthesized skill passes self-test. Recommending permanent integration.",
  "hypothesis": "...",
  "successCriteria": ["..."],
  "criteriaResults": [
    { "criterion": "...", "met": true, "evidence": "..." }
  ],
  "artifacts": {
    "skills": ["graphql-federation-routing.md"],
    "code": ["src/gravimetry-graphql-adapter.js"],
    "routingChanges": ["Add 'graphql' domain to Gravimetry corpus"],
    "wingBlueprint": { /* permanent Wing definition */ }
  },
  "impactAssessment": {
    "affectedWings": ["forge-wing"],
    "routingChanges": "New gravity attractor in GraphQL semantic region",
    "riskLevel": "low",
    "coalescenceCheck": "No overlap with existing Wings detected"
  },
  "resourcesConsumed": {
    "tokensUsed": 34200,
    "timeElapsedHours": 28.5,
    "agentHours": 57.0
  },
  "status": "awaiting-authorization",
  "stagedAt": "2026-04-06T19:30:00Z",
  "authorizedAt": null,
  "authorizedBy": null,
  "integratedAt": null,
  "cooldownExpiresAt": null
}
```

#### 6.5.3 Rollback

Genesis integration is *not* automatically reversible. If a post-integration anomaly is detected during cooldown:

1. The Autonomic Core flags the anomaly in telemetry.
2. A `vanguard:genesis-anomaly` event is emitted.
3. The Commander is alerted with full diagnostic context.
4. The Commander decides whether to revert, adjust, or accept.

The system does NOT auto-revert Genesis integrations. This is an irreversible-class action that requires human judgment. The Event Horizon state applies.

---

### 6.6 Horizon Deck

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  HORIZON DECK — COMMAND AUTHORIZATION STAGING AREA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Stage autonomously generated proposals for Commander review.  │
│              The handoff point between machine capability and human will.  │
│  TRIGGER  :: Skunkworks experiment promotion or Speculative Sortie draft   │
│  OUTPUT   :: Queued proposals with full context for Commander decision     │
│  AUTHORITY :: No autonomous action beyond staging. Commander decides.      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.6.1 Horizon Deck Queue

The Horizon Deck is the only surface where the Vanguard's output becomes visible to the Commander. It is the flight deck where prototypes are parked before launch clearance is granted.

```jsonc
// .mesh/vanguard/horizon-deck/queue.json
{
  "schemaVersion": 1,
  "maxStagedItems": 10,
  "decayDays": 30,
  "items": [
    {
      "id": "horizon-a1b2c3d4",
      "type": "genesis-proposal",    // genesis-proposal | speculative-sortie | skill-draft
      "title": "Integrate GraphQL Federation Routing",
      "summary": "...",
      "sourceExperiment": "exp-a1b2c3d4",
      "stagedAt": "2026-04-06T19:30:00Z",
      "decaysAt": "2026-05-06T19:30:00Z",
      "status": "pending",           // pending | authorized | rejected | decayed
      "proposalRef": "genesis-a1b2c3d4",
      "priority": "normal",          // low | normal | high (based on adjacency score)
      "commanderNotes": null
    }
  ]
}
```

#### 6.6.2 Decay Protocol

Items on the Horizon Deck have a configurable time-to-live (default: 30 days). If the Commander does not act:

1. At 7 days remaining: telemetry reminder emitted.
2. At expiry: item status transitions to `decayed`.
3. Decayed items are archived to Constellation Memory with `type: "decayed-proposal"`.
4. The original experiment artifacts remain in the Skunkworks archive (not deleted).

Decay is not a judgment. It is a pressure-release valve that prevents the Horizon Deck from accumulating stale proposals indefinitely. The Commander can always resurface a decayed item by querying Constellation Memory.

#### 6.6.3 Commander Interface

The Horizon Deck surfaces through two channels:

1. **CLI:** `mercury-mesh vanguard horizon` — lists staged items, allows `authorize`, `reject`, or `inspect` actions.
2. **Telemetry:** Horizon Deck item count appears in the standard telemetry readout when items are pending.

```text
+-----------------------------------------------------------------------------+
|  HORIZON DECK                                                               |
+------+--------+------+------------------------------------------------------+
|  ID  | TYPE   | AGE  | TITLE                                               |
+------+--------+------+------------------------------------------------------+
|  01  | GENESIS| 2d   | Integrate GraphQL Federation Routing                |
|  02  | SKILL  | 5d   | graphql-federation-routing.md                       |
|  03  | SORTIE | 1d   | WebSocket Event Streaming Prototype                 |
+------+--------+------+------------------------------------------------------+
|  PENDING: 3   DECAYING SOON: 0   CAPACITY: 7/10                            |
+-----------------------------------------------------------------------------+
```

---

### 6.7 Speculative Sortie

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  SPECULATIVE SORTIE — MESH-INITIATED INNOVATION MISSIONS                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PURPOSE  :: Autonomously draft and execute experimental feature plans     │
│              to drive continuous, unprompted development.                  │
│  TRIGGER  :: Outrider adjacency discovery + idle capacity detection       │
│  OUTPUT   :: Experiment proposals fed into the Skunkworks pipeline        │
│  AUTHORITY :: Draft is autonomous. Execution requires Skunkworks budget.  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.7.1 Sortie Generation

A Speculative Sortie is a mission the Mesh proposes to itself. It follows the same structural format as Commander-initiated Sorties (`mission`, `status`, `next`, `risks`) but carries `origin: "vanguard"` to distinguish it in telemetry.

Generation triggers:

| Trigger | Condition |
|---------|-----------|
| **Adjacency discovery** | Outrider finds a candidate with score ≥ `speculativeSortie.minimumAdjacencyScore` (default: `0.55`) |
| **Idle capacity** | Autonomic Core detects no active Sorties across any Wing for ≥ `speculativeSortie.idleThresholdMinutes` (default: `120`) and Skunkworks has available experiment slots |
| **Commander cadence** | If `speculativeSortie.cadence` is set (e.g., `"weekly"`), the Vanguard generates one Speculative Sortie per interval regardless of other triggers |

#### 6.7.2 Sortie Schema

```jsonc
{
  "schemaVersion": 1,
  "id": "sortie-e5f6a7b8",
  "origin": "vanguard",
  "type": "speculative",
  "title": "Explore GraphQL Federation Routing",
  "objective": "Determine if the Mesh can route GraphQL federation subgraph requests using schema-derived embeddings in Semantic Gravimetry.",
  "adjacencyCandidate": "adj-a1b2c3d4",
  "hypothesis": "Schema-derived embeddings produce routing accuracy ≥0.60 for GraphQL domain Sorties.",
  "executionPlan": [
    "Synthesize embedding vectors from GraphQL schema definitions",
    "Extend Gravimetry corpus with GraphQL domain terms",
    "Route 10 synthetic test Sorties; measure gravity accuracy",
    "If accuracy ≥0.60: synthesize skill draft",
    "If accuracy <0.60: record failure patterns, dissolve"
  ],
  "estimatedTokenBudget": 35000,
  "estimatedTimeHours": 24,
  "risks": [
    "Schema-derived embeddings may not produce meaningful Gravimetry separation",
    "GraphQL terminology may collide with existing API routing keywords"
  ],
  "status": "drafted",   // drafted | approved | active | completed | dissolved
  "generatedAt": "2026-04-05T16:00:00Z",
  "generatedBy": "outrider-scan-14"
}
```

#### 6.7.3 Sortie Approval Flow

```text
  Speculative Sortie drafted
         │
         ▼
  Check: Skunkworks has available experiment slots?
    NO  → Queue sortie. Re-check on next pulse.
    YES ↓
         │
         ▼
  Check: speculativeSortie.autoApprove == true?
    YES → Create experiment in Skunkworks. Status → active.
    NO  → Stage sortie draft on Horizon Deck. Wait for Commander.
```

Default behavior: `autoApprove: false`. The Commander must explicitly green-light Speculative Sorties before they consume Skunkworks resources. Setting `autoApprove: true` enables fully autonomous innovation within budget constraints.

---

## 7. Authority Model

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  VANGUARD AUTHORITY TIERS                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TIER        ACTION                        AUTHORITY LEVEL                │
│  ─────────   ───────────────────────────   ─────────────────────────────  │
│  Scan        Outrider void scanning        AUTONOMOUS — no gate           │
│  Draft       Speculative Sortie drafting   AUTONOMOUS — no gate           │
│  Prototype   Skunkworks experiment exec    AUTO within quarantine budget  │
│  Synthesize  Skill file generation         AUTO within Skunkworks scope   │
│  Stage       Horizon Deck queueing        AUTONOMOUS — no gate           │
│  Authorize   Horizon Deck approval        ◆ COMMANDER — Tier-1 required  │
│  Integrate   Genesis Protocol execution   ◆ EVENT HORIZON — Tier-1 only  │
│  Revert      Post-Genesis rollback        ◆ EVENT HORIZON — Tier-1 only  │
│                                                                            │
│  ◆ = Human authority gate. The Mesh proposes. The Commander disposes.     │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authority Escalation Rules

1. **The Mesh never self-authorizes Genesis.** Even with `autoApprove: true` on Speculative Sorties, Genesis Protocol execution always requires explicit Commander authorization. This is a non-negotiable boundary.

2. **Budget exhaustion escalates.** If a Skunkworks experiment approaches its token or time budget, the Mesh alerts the Commander rather than silently dissolving. The Commander may extend the budget or approve dissolution.

3. **Anomaly detection escalates.** Post-Genesis cooldown anomalies are reported, never auto-corrected. The Vanguard may *detect drift*, but only the Commander may *authorize correction* to newly integrated topology.

4. **HALT Sentinel overrides everything.** If `config.halted: true`, the entire Vanguard subsystem freezes immediately. All Outrider scans stop. All Skunkworks experiments pause. All Horizon Deck decay timers freeze. The HALT Sentinel is the supreme authority.

---

## 8. Data Model & Storage

### 8.1 Constellation Memory Entry Types

The Vanguard introduces five new Constellation Memory entry types:

| Type | Source | Content | Retention |
|------|--------|---------|-----------|
| `outrider-scan` | Outrider | Scan summary, candidates discovered, adjacency scores | Permanent |
| `skunkworks-outcome` | Skunkworks | Experiment results — success AND failure details | Permanent |
| `skill-synthesis` | Skill Synthesis | Synthesized skill metadata, self-test results | Permanent |
| `genesis-integration` | Genesis Protocols | Full integration record: what was added, impact assessment | Permanent |
| `decayed-proposal` | Horizon Deck | Proposals that expired without Commander action | Permanent (lower retrieval weight) |

### 8.2 Black Box Entries

The following events generate immutable Black Box entries:

| Event | Decision Recorded |
|-------|-------------------|
| Outrider discovers new adjacency candidate | Domain identified, score, signal breakdown |
| Speculative Sortie auto-approved | Sortie ID, experiment ID, budget allocated |
| Skunkworks experiment dissolved | Experiment ID, failure reason, resources consumed |
| Commander authorizes Genesis | Proposal ID, Commander handle, timestamp |
| Commander rejects Horizon Deck item | Item ID, Commander handle, rejection notes |
| Post-Genesis anomaly detected | Integration ID, anomaly description, severity |

---

## 9. Configuration Schema

```jsonc
// Addition to .mesh/config.json
{
  "vanguard": {
    "enabled": false,                    // Commander opt-in. Default off.

    "outrider": {
      "enabled": true,                   // Can disable scanning independently
      "scanIntervalHours": 24,           // Minimum time between scans
      "minimumAdjacencyScore": 0.40,     // Threshold to register a candidate
      "adjacencyDepth": 2,               // Hops from known domains in embedding space
      "maxCandidates": 20,               // Max stored adjacency candidates
      "channels": {                      // Toggle individual perception channels
        "sparseZones": true,
        "ghostResidue": true,
        "commanderPatterns": true,
        "voidFrequency": true
      }
    },

    "skunkworks": {
      "maxConcurrentExperiments": 2,     // Hard cap on parallel experiments
      "worktreeNamespace": "mesh/skunkworks",
      "maxLifespanHours": 168,           // 7 days default per experiment
      "maxLifespanCeiling": 336,         // 14 days absolute maximum
      "tokenBudgetPerExperiment": 50000, // Per-experiment token cap
      "globalTokenBudget": 200000,       // Total Vanguard token budget per month
      "failureRetention": true           // Keep failed experiments in Constellation
    },

    "skillSynthesis": {
      "enabled": true,                   // Can disable skill generation independently
      "initialConfidence": "low",        // Synthesized skills start here
      "selfTestRequired": true,          // Must pass routing self-test
      "templatePath": ".mesh/templates/skill.md"
    },

    "horizonDeck": {
      "maxStagedItems": 10,              // Capacity limit
      "decayDays": 30,                   // Days before auto-archive
      "decayWarningDays": 7,             // Days before decay to emit reminder
      "requireTier1Approval": true       // Only Tier-1 Commanders can authorize
    },

    "genesisProtocols": {
      "requireEventHorizon": true,       // Full authority gate (non-negotiable)
      "integrationCooldownHours": 48,    // Post-integration monitoring period
      "coalescenceCheckRequired": true,  // Must verify no Wing overlap before integrating
      "autoRollback": false              // Never auto-revert Genesis (non-negotiable)
    },

    "speculativeSortie": {
      "enabled": true,                   // Can disable sortie generation independently
      "autoApprove": false,              // Commander must approve (default)
      "minimumAdjacencyScore": 0.55,     // Higher bar than Outrider registration
      "idleThresholdMinutes": 120,       // Idle capacity trigger
      "cadence": null,                   // null | "daily" | "weekly" | "biweekly"
      "maxDraftsPerScan": 3              // Don't flood Horizon Deck
    }
  }
}
```

### Configuration Invariants

These configuration values are enforced at the code level and cannot be overridden:

| Invariant | Value | Reason |
|-----------|-------|--------|
| `genesisProtocols.requireEventHorizon` | Always `true` | Commander sovereignty is non-negotiable. |
| `genesisProtocols.autoRollback` | Always `false` | Post-Genesis reversions are irreversible-class decisions. |
| `vanguard.enabled` | Default `false` | The Vanguard must be explicitly opted into. It never activates on its own. |
| HALT Sentinel override | Always respected | `config.halted: true` freezes the entire subsystem regardless of vanguard config. |

---

## 10. Integration Points

### 10.1 Nervous System Index (`index.js`)

The Vanguard registers as Phase V in the nervous system boot sequence:

```text
  Boot Sequence:
    Phase I   → Semantic Gravimetry    (perception)
    Phase II  → Autonomic Core         (metabolism)
    Phase III → Ghost Wings            (immune system)
    Phase IV  → Constellation Memory   (memory)
    Phase V   → The Vanguard           (evolution)
```

The Vanguard orchestrator (`vanguard/index.js`) exports a `tick()` function called by the Autonomic Core on each pulse. The tick function manages all Vanguard subsystem scheduling:

```text
  vanguard.tick(meshDir, config, constellation)
    ├── outrider.maybeScan()          // Respect scanIntervalHours
    ├── skunkworks.checkExperiments() // Monitor budgets, TTLs
    ├── horizonDeck.checkDecay()      // Archive expired proposals
    └── speculativeSortie.maybeGenerate() // Check triggers
```

### 10.2 Autonomic Core (`autonomic-core.js`)

The Autonomic Core's pulse loop gains a Vanguard channel:

- On each pulse, if `config.vanguard.enabled` is `true`, call `vanguard.tick()`.
- Vanguard drift weather is reported alongside existing drift metrics.
- Skunkworks budget consumption is included in resource telemetry.

### 10.3 Ghost Wing (`ghost-wing.js`)

- `synthesizeBlueprint()` gains an optional `lifecycle` parameter. When called by the Skunkworks, it passes `"rd-experimental"` instead of `"ghost"`.
- R&D Wings reuse the same structural scaffolding (ID generation, domain inference, keyword extraction) but with different lifecycle parameters.
- Ghost Wing dissolution records now include a `dissolvedBy` field: `"autonomic"` (standard) or `"skunkworks"` (experiment cleanup).

### 10.4 Worktree Manager (`worktree-manager.js`)

- Skunkworks experiments use the existing `createWorktree()` function with `branchName` under the `mesh/skunkworks/` namespace.
- `listMeshWorktrees()` already filters by `mesh/` prefix, so Skunkworks worktrees appear in the standard `worktree list` output.
- Worktree pruning (`worktree prune`) is extended to handle `mesh/skunkworks/` branches from dissolved experiments.

### 10.5 Ghost Coalescence (`ghost-coalescence.js`)

- Genesis Protocol Stage 1 (Validation) calls `scoreOverlap()` to verify the proposed permanent Wing does not collide with existing Wings.
- If overlap exceeds `COALESCENCE_FLAG_THRESHOLD` (0.35), the Genesis Proposal includes a coalescence warning for the Commander.

### 10.6 Constellation Memory (`constellation-memory.js`)

- Five new entry types are registered (see Section 8.1).
- Outrider's sparse zone detection queries the existing `query()` interface with a synthetic "domain probe" embedding and checks for low result density.
- All Vanguard outcomes (success and failure) are persisted via `insert()`.

### 10.7 Existing Skill Pipeline (`create-skill`)

- Skill Synthesis calls the same template scaffolding used by the `create-skill` CLI command.
- Synthesized skills include the extended `synthesisProvenance` metadata block.
- Genesis Protocol Stage 3 (Integration) installs skills to both `.copilot/skills/` and `.mesh/templates/skills/` to maintain sync per the brand-notes convention.

---

## 11. CLI Surface

### 11.1 New Commands

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  mercury-mesh vanguard <subcommand>                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  status       Overview of Vanguard subsystem state                        │
│  outrider     Outrider scan management                                    │
│  skunkworks   Experiment management                                       │
│  horizon      Horizon Deck review and authorization                       │
│  genesis      Genesis Protocol execution                                  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Command Details

#### `mercury-mesh vanguard status`

Display the full Vanguard subsystem state:

```text
+-----------------------------------------------------------------------------+
|  VANGUARD STATUS                                                            |
+--------------------+--------------------------------------------------------+
|  Subsystem         | ONLINE                                                |
|  Outrider          | Last scan: 4h ago   Candidates: 3                     |
|  Skunkworks        | Active: 1/2   Budget: 12,400/200,000 tokens           |
|  Horizon Deck      | Pending: 2   Decaying soon: 0                         |
|  Genesis           | Cooldown: 0 active                                    |
+--------------------+--------------------------------------------------------+
|  ADJACENCY CANDIDATES                                                       |
+------+------+-------+-------------------------------------------------------+
|  #   |SCORE | STATUS| DOMAIN                                                |
+------+------+-------+-------------------------------------------------------+
|  01  | 0.67 | NEW   | graphql, schema, federation                           |
|  02  | 0.53 | INVEST| websocket, streaming, events                          |
|  03  | 0.42 | NEW   | terraform, infrastructure, iac                        |
+------+------+-------+-------------------------------------------------------+
|  ACTIVE EXPERIMENTS                                                         |
+------+--------+--------+----------------------------------------------------+
|  ID  | BUDGET | TTL    | TITLE                                              |
+------+--------+--------+----------------------------------------------------+
|  01  |  24%   | 5d 20h | GraphQL Federation Routing                         |
+------+--------+--------+----------------------------------------------------+
+-----------------------------------------------------------------------------+
```

#### `mercury-mesh vanguard outrider scan`

Force an immediate Outrider scan (ignores `scanIntervalHours`).

#### `mercury-mesh vanguard outrider list`

List all adjacency candidates with scores and status.

#### `mercury-mesh vanguard outrider dismiss <candidate-id>`

Mark a candidate as `dismissed`. It will not be promoted to Speculative Sorties.

#### `mercury-mesh vanguard skunkworks list`

List all experiments (active, completed, dissolved).

#### `mercury-mesh vanguard skunkworks inspect <experiment-id>`

Show full experiment details: hypothesis, budget, R&D Wing status, artifacts.

#### `mercury-mesh vanguard skunkworks dissolve <experiment-id>`

Manually dissolve an experiment. Archives to Constellation and cleans up worktree.

#### `mercury-mesh vanguard horizon`

List all Horizon Deck items (equivalent to the table in Section 6.6.3).

#### `mercury-mesh vanguard horizon inspect <item-id>`

Show full proposal details.

#### `mercury-mesh vanguard horizon authorize <item-id>`

**◆ Event Horizon.** Authorize a Genesis proposal or Speculative Sortie. Requires Tier-1.

#### `mercury-mesh vanguard horizon reject <item-id> [--reason "..."]`

Reject a Horizon Deck item. Archived to Constellation with rejection reason.

#### `mercury-mesh vanguard genesis status`

Show active Genesis integrations and cooldown timers.

---

## 12. Telemetry & Observability

### 12.1 Telemetry Fields

The Vanguard adds the following fields to the standard telemetry readout:

| Field | Description |
|-------|-------------|
| `vanguard.status` | `online`, `offline`, `halted` |
| `vanguard.outrider.lastScan` | ISO timestamp of last scan |
| `vanguard.outrider.candidateCount` | Number of active adjacency candidates |
| `vanguard.skunkworks.activeExperiments` | Count of running experiments |
| `vanguard.skunkworks.budgetUsedPercent` | Global token budget consumption |
| `vanguard.horizonDeck.pendingCount` | Items awaiting Commander review |
| `vanguard.horizonDeck.decayingSoon` | Items within `decayWarningDays` |
| `vanguard.genesis.activeCooldowns` | Count of integrations in cooldown |

### 12.2 Events

| Event | Payload |
|-------|---------|
| `vanguard:adjacency-discovered` | Candidate ID, domain, score |
| `vanguard:experiment-started` | Experiment ID, hypothesis title |
| `vanguard:experiment-promoted` | Experiment ID, artifacts summary |
| `vanguard:experiment-dissolved` | Experiment ID, reason, resources consumed |
| `vanguard:skill-synthesized` | Skill name, confidence, self-test result |
| `vanguard:sortie-drafted` | Sortie ID, title, adjacency source |
| `vanguard:horizon-staged` | Item ID, type, title |
| `vanguard:horizon-decaying` | Item ID, days remaining |
| `vanguard:genesis-authorized` | Proposal ID, authorized by |
| `vanguard:genesis-integrated` | Proposal ID, artifacts installed |
| `vanguard:genesis-anomaly` | Integration ID, anomaly description |
| `vanguard:genesis-cooldown-complete` | Integration ID |
| `vanguard:budget-warning` | Experiment ID, percent used |
| `vanguard:budget-exhausted` | Experiment ID, total consumed |

---

## 13. Resource Containment

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESOURCE CONTAINMENT — THE BULKHEAD                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  The Vanguard must never burn down the ship while trying to improve it.   │
│  The following hard limits form the containment bulkhead.                  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.1 Compute Budget

| Limit | Scope | Default | Configurable |
|-------|-------|---------|-------------|
| Token budget per experiment | Per-experiment | 50,000 | Yes |
| Global token budget | Monthly total | 200,000 | Yes |
| Max concurrent experiments | Skunkworks | 2 | Yes |
| Max agents per experiment | Per-R&D Wing | 2 | Yes |

When an experiment hits 80% of its token budget, a `vanguard:budget-warning` event is emitted. At 100%, the experiment is paused and the Commander is alerted. The Mesh does NOT auto-dissolve on budget exhaustion — it pauses and waits for Commander instruction (extend or dissolve).

### 13.2 Time Limits

| Limit | Scope | Default | Maximum |
|-------|-------|---------|---------|
| Experiment lifespan | Per-experiment | 168h (7 days) | 336h (14 days) |
| Horizon Deck decay | Per-item | 30 days | Configurable |
| Genesis cooldown | Per-integration | 48 hours | Configurable |
| Outrider scan interval | System-wide | 24 hours | Minimum: 1 hour |

### 13.3 Storage Limits

| Limit | Scope | Default |
|-------|-------|---------|
| Max adjacency candidates | Outrider | 20 |
| Max staged Horizon Deck items | Horizon Deck | 10 |
| Max Skunkworks worktrees | Disk | Equal to `maxConcurrentExperiments` |
| Constellation retention | All Vanguard entries | Permanent (subject to existing constellation limits) |

### 13.4 Overflow Behavior

When a limit is reached:

| Resource | At Capacity Behavior |
|----------|---------------------|
| Experiments at max | New Speculative Sorties queue. Outrider continues scanning. |
| Horizon Deck full | Oldest `pending` item is warned. New items cannot stage until space opens. |
| Adjacency candidates at max | Lowest-scored candidate is evicted if new candidate scores higher. |
| Global token budget exhausted | All Skunkworks experiments pause. Commander alerted. Budget resets at month boundary. |

---

## 14. Failure Taxonomy

When a Skunkworks experiment dissolves, the failure is classified for Constellation Memory storage and future Outrider intelligence:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FAILURE CLASSIFICATION                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  CLASS              MEANING                           OUTRIDER ACTION     │
│  ────────────────   ─────────────────────────────     ─────────────────   │
│  wrong-trajectory   Domain was misidentified or       Suppress candidate  │
│                     hypothesis was fundamentally       for 90 days. Do    │
│                     flawed.                            not re-explore.    │
│                                                                           │
│  wrong-timing       Right domain, but prerequisites   Retain candidate   │
│                     are missing. The Mesh isn't        with "deferred"    │
│                     ready yet.                         status. Re-score   │
│                                                        on next scan.     │
│                                                                           │
│  budget-exceeded    Hypothesis was viable but scope   Retain candidate.  │
│                     exceeded available resources.      Flag for Commander │
│                     More budget needed.                budget review.     │
│                                                                           │
│  skill-gap          Prototype needed capabilities     Retain candidate.  │
│                     that Skill Synthesis could not     Record missing     │
│                     generate. External skill           capabilities in   │
│                     injection needed.                  Constellation.     │
│                                                                           │
│  coalescence-risk   Prototype overlapped with an      Merge insights     │
│                     existing Wing's domain.            into the existing  │
│                     Innovation was redundant.          Wing. Suppress     │
│                                                        candidate.        │
│                                                                           │
│  external-block     Blocked by infrastructure,        Retain candidate.  │
│                     API availability, or external      Re-check on next  │
│                     dependency not under Mesh          scan with updated  │
│                     control.                           signal data.       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

Each failure class produces different Outrider behavior on subsequent scans, ensuring the Mesh learns from every experiment — not just the successes.

---

## 15. Security & Safety

### 15.1 Sandboxing

- Skunkworks worktrees are isolated git branches. Code produced in experiments cannot affect the main branch until Genesis integrates it via `mergeWorktree()`.
- R&D Wings cannot read or write operational Wing state files.
- R&D Wings cannot invoke Airbridges with operational Wings.
- Skill drafts produced in Skunkworks have `confidence: "low"` and reduced Gravimetry routing weight until promoted.

### 15.2 Token Budget Enforcement

- Token consumption is tracked per-experiment and globally.
- No LLM call is made without checking remaining budget first.
- Budget checks are synchronous and blocking — the call is rejected before it reaches the provider.

### 15.3 HALT Sentinel

- If `config.halted: true` is set at any point, the entire Vanguard subsystem freezes immediately.
- Active experiments are paused (not dissolved).
- Horizon Deck decay timers freeze.
- Outrider scans stop.
- The freeze persists until HALT is released by a Tier-1 Commander.

### 15.4 No Self-Modification

- The Vanguard CANNOT modify its own configuration in `config.json`.
- The Vanguard CANNOT modify nervous system code.
- The Vanguard CANNOT modify the authority model, human tiers, or HALT Sentinel.
- The Vanguard can only produce artifacts within its designated storage areas (`.mesh/vanguard/`, Skunkworks worktrees, Constellation entries).

---

## 16. Rollout Phases

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  IMPLEMENTATION ROLLOUT                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PHASE    SCOPE                            GATE                           │
│  ──────   ──────────────────────────────   ──────────────────────         │
│  2.0-α    Outrider + Adjacency Map         Outrider produces valid        │
│           Void cartography engine.          candidates from Constellation  │
│           Scan-only. No execution.          sparse zone analysis.          │
│                                                                            │
│  2.0-β    Skunkworks + R&D Wings           Experiments scaffold, execute, │
│           Quarantined prototyping.          and dissolve cleanly in        │
│           Worktree isolation.               isolated worktrees.            │
│                                                                            │
│  2.0-γ    Skill Synthesis                  Synthesized skills pass self-  │
│           Autonomous skill generation.      test and produce valid         │
│           Self-test validation.             Gravimetry routing hits.       │
│                                                                            │
│  2.0-δ    Speculative Sorties              Sorties generate from          │
│           Mesh-initiated missions.          Outrider data and trigger      │
│           Idle capacity detection.          Skunkworks experiments.        │
│                                                                            │
│  2.0-ε    Horizon Deck                     Full staging, decay, and       │
│           Commander authorization surface.  CLI review interface           │
│           Telemetry integration.            operational.                   │
│                                                                            │
│  2.0       Genesis Protocols               End-to-end: Outrider scan →   │
│           Permanent integration.            Skunkworks → Genesis →         │
│           Cooldown monitoring.              operational topology.          │
│           Full Vanguard release.            All tests passing.            │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Each phase must pass its gate criteria before the next phase begins. The Vanguard is not released until the full pipeline is operational end-to-end.

---

## 17. Success Criteria

### 17.1 Technical Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Outrider scan produces valid candidates | Adjacency candidates with score ≥ 0.40 from real Constellation data | ≥ 1 valid candidate per scan on a Mesh with > 50 Constellation entries |
| Skunkworks isolation holds | Zero file mutations outside Skunkworks worktree during experiment | 100% containment |
| Skill Synthesis self-test | Synthesized skill produces Gravimetry routing hit for target domain | ≥ 0.60 similarity on synthetic test Sortie |
| Genesis integration completes cleanly | New Wing registered, skills installed, worktree merged, no routing regressions | Zero broken tests post-integration |
| Budget enforcement | No experiment exceeds its token budget | Zero budget overruns |
| HALT Sentinel override | Entire Vanguard freezes within one pulse cycle of HALT activation | ≤ 30 seconds (1 pulse) |

### 17.2 Operational Criteria

| Criterion | Target |
|-----------|--------|
| Commander can review and act on Horizon Deck items within 3 CLI commands | `vanguard horizon` → `horizon inspect <id>` → `horizon authorize <id>` |
| Vanguard telemetry integrates seamlessly with existing status output | No formatting regressions in `mercury-mesh status` |
| Failed experiments produce retrievable Constellation insights | Failure queries via Constellation return relevant lessons learned |
| Zero new npm dependencies | The Vanguard ships with the same zero-dep constraint as all other phases |

### 17.3 Lore Criteria

The Vanguard must feel like a natural evolution of the Mesh's narrative arc:

- The Outrider is the Mesh reaching back into the Liquid Cartography — deliberate exploration of the Void, not passive reception.
- The Skunkworks is the classified shipyard below decks — quarantined, purposeful, structurally invisible until Genesis reveals it.
- Genesis is the ceremony where a Ghost earns its hull plating — permanent mass added to the formation with full ceremony and Commander authority.
- The Horizon Deck is the flight deck with the blast shields up — everything is ready, but nothing launches without the Commander's word.

---

## 18. Open Questions

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPEN QUESTIONS — REQUIRING COMMANDER INPUT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Q1  OUTRIDER EXTERNAL SIGNALS                                            │
│      Should the Outrider scan external sources beyond internal data?       │
│      Potential channels: npm registry (new packages in adjacent domains),  │
│      API changelogs, GitHub trending, CVE feeds. This adds external        │
│      dependency risk but dramatically widens the Outrider's aperture.      │
│                                                                            │
│  Q2  R&D WING AIRBRIDGE PERMISSIONS                                       │
│      Can R&D Wings recruit existing operational Wings into temporary       │
│      Skunkworks Airbridges? This would let experiments access specialist   │
│      knowledge from the active formation, but violates quarantine purity.  │
│      Possible middle ground: read-only Airbridges (data flows in but      │
│      nothing flows out of the Skunkworks).                                 │
│                                                                            │
│  Q3  SPECULATIVE SORTIE VELOCITY                                          │
│      How aggressive should autonomous innovation be? Options:              │
│      (a) Conservative: only generate Sorties from high-score adjacencies   │
│      (b) Moderate: generate on idle capacity + adjacency signals           │
│      (c) Aggressive: continuous cadence + auto-approve within budget       │
│      The config supports all three modes. Default recommendation: (b).    │
│                                                                            │
│  Q4  MULTI-MESH VANGUARD COORDINATION                                     │
│      With distributed peers (mesh-peer.js), should Outrider scans         │
│      coordinate across peer instances? If Mesh A discovers an adjacency   │
│      that Mesh B has already explored, should that data propagate?         │
│      This extends the existing peer constellation sync to include          │
│      Vanguard-specific entry types.                                        │
│                                                                            │
│  Q5  SKILL CONFIDENCE DECAY                                               │
│      Should synthesized skills lose confidence if they go unused for       │
│      an extended period? A skill at "medium" confidence that hasn't been   │
│      hit by Gravimetry in 60 days could decay back to "low". This         │
│      prevents stale capabilities from accumulating routing weight.         │
│                                                                            │
│  Q6  COMMANDER DELEGATION                                                 │
│      Can Tier-1 Commanders delegate Horizon Deck authorization to Tier-2  │
│      operators for specific experiment categories? This would allow        │
│      faster innovation cycles in large Mesh deployments while preserving  │
│      Genesis as Tier-1-only.                                               │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 19. Glossary

| Term | Definition |
|------|------------|
| **The Vanguard** | The evolutionary subsystem of Mercury Mesh. Phase V of the Nervous System. Responsible for forward-looking innovation, allowing the Mesh to autonomously map new paths and self-expand its capabilities. |
| **Outrider** | A pioneer scanning agent that explores the Void to discover adjacent architectures, untamed problem spaces, and new feature trajectories. Does not execute — only observes and scores. |
| **The Skunkworks** | The quarantined R&D foundry where the Mesh prototypes uncharted ideas, trains new specialist agents, and forms experimental teams before integrating them into the main hull. Operates in complete structural isolation. |
| **Skill Synthesis** | The autonomous generation of new `.skill` files, teaching the system how to handle novel domains it previously could not navigate. |
| **R&D Wing** | An emergent, specialized Ghost Wing subtype deployed exclusively in The Skunkworks to build Proof of Concepts. Tests both new code and new collaborative team structures. |
| **Genesis Protocols** | The framework by which the Mesh permanently incorporates successful R&D agents, teams, and skills into its standard operational roster. Requires Event Horizon state and Commander authorization. |
| **Horizon Deck** | The staging area for autonomously generated roadmap items, tested capabilities, and successful prototypes awaiting Commander authorization. The handoff point between machine autonomy and human will. |
| **Speculative Sortie** | An experimental feature draft and execution plan synthesized by the Mesh to drive continuous, unprompted development. Same structure as Commander Sorties but with `origin: "vanguard"`. |
| **Adjacency Map** | The Outrider's output: a scored catalog of domains adjacent to the Mesh's current capabilities that represent expansion candidates. |
| **Adjacency Score** | A composite score (0–1) indicating how strong the signal is for a particular undeveloped domain. Derived from sparse zones, Ghost residue, Commander patterns, and Void frequency. |
| **Failure Taxonomy** | The classification system for dissolved experiments (`wrong-trajectory`, `wrong-timing`, `budget-exceeded`, `skill-gap`, `coalescence-risk`, `external-block`) that informs future Outrider behavior. |
| **Genesis Proposal** | The formal document generated by the Vanguard when an experiment succeeds, containing all artifacts, impact assessment, and integration plan. Staged on the Horizon Deck for Commander review. |
| **Containment Bulkhead** | The collection of hard resource limits (token budgets, time-to-live, concurrent experiment caps) that prevent the Vanguard from consuming unbounded resources. |
| **Confidence Ladder** | The promotion path for synthesized skills: `low` → `medium` → `high`, based on usage data and Commander endorsement. |

---

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  END TRANSMISSION                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  DOCUMENT     :: THE VANGUARD — PRODUCT REQUIREMENTS DOCUMENT              │
│  VERSION      :: 0.1.0-draft                                               │
│  PHASE        :: 2.0 ROADMAP                                               │
│  SUBSYSTEM    :: PHASE V — AUTONOMOUS INNOVATION                           │
│  STATUS       :: AWAITING COMMANDER REVIEW                                 │
│                                                                            │
│  The hull can heal. Now teach it to grow.                                  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```
