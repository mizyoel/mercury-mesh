```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║    ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗        ║
║   ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗       ║
║   ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║       ║
║   ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║       ║
║   ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝       ║
║    ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝        ║
║                                                                            ║
║    O N B O A R D I N G   S E Q U E N C E                                  ║
║    First Light on the Bridge.                                              ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSMISSION                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  TO       :: NEW COMMANDER                                                 │
│  FROM     :: SHIP'S COMPUTER                                               │
│  RE       :: FIRST LIGHT — BRIDGE ACTIVATION PROTOCOL                      │
│  CLASS    :: ONBOARDING / OPERATIONAL                                      │
│  PRIORITY :: IMMEDIATE                                                     │
│                                                                            │
│  You have been granted bridge access. What follows is the full sequence    │
│  from cold hull to live mission. Read it once. Then act.                   │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0 — Cold Hull

The bridge is dark. The roster is empty. `config.json` carries the default schema but no crew, no authority map, no mission.

This is **Init Mode** — the state every Mercury Mesh installation begins in. The hull is intact. The systems are nominal. But nobody is flying.

Your first job is not to build. It is to understand what you are standing inside.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  HULL DIAGNOSTIC                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Runtime          .mesh/                         ✓ PRESENT                 │
│  Config           .mesh/config.json              ✓ LOADED                  │
│  Roster           .mesh/team.md                  ○ EMPTY                   │
│  Flight Path      .mesh/manifesto.md             ✓ SEALED                  │
│  Black Box        .mesh/decisions.md             ✓ RECORDING               │
│  Routing Table    .mesh/routing.md               ○ UNBOUND                 │
│  Ceremonies       .mesh/ceremonies.md            ✓ ARMED                   │
│  Authority Map    config.json → humanTiers       ○ UNCLAIMED               │
│                                                                            │
│  DIAGNOSIS: Hull is cold. Awaiting Commander registration.                 │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Read the Flight Path first: `.mesh/manifesto.md`. This is the genesis block. It does not change without Tier-1 consensus. Every wing, every specialist, every decision you make on this bridge passes through those five principles before execution.

---

## Phase 1 — First Light

You turn the lights on. This means two things:

**1. Claim the chair.** Register yourself as a Tier-1 Commander in `config.json`.

```json
"humanTiers": {
  "tier1": ["your-github-handle"],
  "tier2": [],
  "tier3": []
}
```

This is not symbolic. Tier-1 authority controls:
- Agent promotions (shadow → probation → active)
- Architectural vetoes
- HALT Sentinel activation and release
- Deployment approvals
- Any action the bridge flags as irreversible

You are the final authority. The mesh extends your reach. It does not replace your judgment.

**2. Define the void.** Open a chat with the Mercury Mesh agent and declare what this bridge exists to navigate.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  MISSION DECLARATION                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  The bridge needs three coordinates to initialize:                         │
│                                                                            │
│    1. LANGUAGE   :: What does this system speak?                            │
│                     (TypeScript, Python, Rust, Go, mixed...)               │
│                                                                            │
│    2. STACK      :: What infrastructure does it ride?                       │
│                     (Node/Express, FastAPI, SvelteKit, bare metal...)      │
│                                                                            │
│    3. OBJECTIVE  :: What must this system accomplish?                       │
│                     (API, CLI, platform, library, full-stack product...)   │
│                                                                            │
│  State these clearly. The bridge will decompose the mission from here.     │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

The Ship's Computer takes your declaration, analyzes the problem-space, and proposes a crew.

---

## Phase 2 — Crew Assembly

The bridge proposes a roster. Each entry is a specialist wing — an agent with a defined charter, a domain scope, and a lifecycle phase.

No agent arrives active. Every agent enters at the phase defined by `onboarding.defaultPhase` in your config. By default, that is **shadow**.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENT LIFECYCLE                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                  ┌──────────┐                                              │
│                  │  SHADOW  │  Read-only. Observes. Builds context.        │
│                  │          │  Cannot modify files or state.               │
│                  └────┬─────┘                                              │
│                       │                                                    │
│             Tier-1 approval                                                │
│                       │                                                    │
│                  ┌────▼──────┐                                             │
│                  │ PROBATION │  Executes. All outputs reviewed by lead     │
│                  │           │  before acceptance. Learning the drift.     │
│                  └────┬──────┘                                             │
│                       │                                                    │
│             Tier-1 approval (or auto-promote after N tasks)                │
│                       │                                                    │
│                  ┌────▼─────┐                                              │
│                  │  ACTIVE  │  Full autonomy within charter scope.         │
│                  │          │  Standard review gates still apply.          │
│                  └──────────┘                                              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Review the proposed roster. Confirm the cast. The bridge writes each agent into `.mesh/team.md` and the routing table in `.mesh/routing.md` binds work types to names.

```text
CREW STATUS POST-ASSEMBLY

  Roster           .mesh/team.md                  ✓ POPULATED
  Routing Table    .mesh/routing.md               ✓ BOUND
  Authority Map    config.json → humanTiers       ✓ CLAIMED
```

The hull is warm. The crew is aboard. But nobody has fired thrusters yet.

---

## Phase 3 — The Shadowing Phase

This is the quiet before thrust.

Shadow-phase agents cannot write code, modify files, or push state. They observe. They analyze. They predict outcomes. They build the internal map that will let them execute with precision when you authorize it.

This phase exists because Mercury Mesh does not believe in ramp-up chaos. A wing that fires thrusters before it understands the drift will overcorrect, produce artifacts that miss the mission vector, and cost the bridge time cleaning up.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  SHADOW PHASE TELEMETRY                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  WHAT AGENTS DO                     │  WHAT AGENTS DO NOT DO               │
│  ─────────────────────────────────  │  ────────────────────────────────    │
│  Read the codebase                  │  Write or modify files               │
│  Analyze architecture               │  Push branches                       │
│  Study the Flight Path              │  Approve or merge work               │
│  Map dependencies                   │  Spawn sub-agents                    │
│  Predict outcomes                   │  Claim issues                        │
│  Report observations to the bridge  │  Execute destructive actions         │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

When you are satisfied that an agent understands the terrain, promote it to probation:

> *"Promote {agent} to probation."*

The Ship's Computer records the transition in the Black Box. The agent begins executing under lead review.

---

## Phase 4 — Probation Burns

Probationary agents execute real work. But every output routes through lead review before the bridge accepts it.

This is where the drift becomes visible. You will see how an agent decomposes a problem, how it handles edge cases, whether its output matches the mission vector. If it drifts, you correct early — before the deviation compounds.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROBATION LOOP                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────────┐           │
│  │  CLAIM  │──▶ │ EXECUTE  │──▶ │ REVIEW  │──▶ │   ACCEPTED   │           │
│  │  issue  │    │  sortie  │    │  by lead │    │ or corrected │           │
│  └─────────┘    └──────────┘    └────┬────┘    └──────────────┘           │
│                                      │                                     │
│                                      ▼                                     │
│                              ┌──────────────┐                              │
│                              │  BLACK BOX   │                              │
│                              │  logs result  │                             │
│                              └──────────────┘                              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

After an agent demonstrates consistent, mission-aligned execution, promote it to active:

> *"Promote {agent} to active."*

If `autoPromoteThreshold` is set to a number in your config, the bridge auto-promotes after that many successful tasks. If it is `false`, every promotion requires your explicit approval.

---

## Phase 5 — Fire Thrusters

The bridge is live. Active agents self-organize around gravity wells. Telemetry flows continuously. The Loom propagates execution intelligence across every wing. The Black Box records every decision, every correction, every lesson.

This is the operating state. From here, your job changes.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMANDER OPERATING MODE                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  YOU DO                              │  THE MESH DOES                      │
│  ──────────────────────────────────  │  ──────────────────────────────     │
│  Define the Flight Path              │  Decompose into sorties             │
│  Read telemetry                      │  Route to the right wings           │
│  Set priorities                      │  Execute within charter scope       │
│  Approve architecture decisions      │  Coordinate across Airbridges       │
│  Activate the HALT Sentinel          │  Record everything to the Black Box │
│  Promote or demote agents            │  Propagate learning through the Loom│
│  Override when the drift exceeds     │  Reform structure around the next   │
│  tolerance                           │  gravity well                       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

You define trajectory. The mesh handles thrust.

---

## Phase 6 — Reading the Drift

A mission in motion produces drift. Drift is not failure — it is the natural deviation between intent and execution. Every complex system drifts. The question is whether you detect it early enough to correct.

Telemetry is how you read the drift. Not status meetings. Not color-coded spreadsheets. Live signal from the bridge.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  DRIFT INDICATORS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  INDICATOR              │  SIGNAL                                          │
│  ───────────────────────┼────────────────────────────────────────────────  │
│  Hull Integrity         │  Build passing. Tests green. Lint clean.         │
│  Mission Vector         │  Work aligns to the declared objective.          │
│  Resource Oxygen        │  Agents operating within compute budget.         │
│  Wing Alignment         │  No conflicting outputs between agents.          │
│  Loom Coherence         │  Knowledge propagating, not siloing.             │
│  Black Box Continuity   │  Decisions logged. No gaps in the ledger.        │
│  Ceremony Compliance    │  Design reviews before, retros after.            │
│                                                                            │
│  When an indicator degrades, the bridge alerts you.                        │
│  You decide: correct course, HALT, or accept the deviation.               │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Automatic Flight Paths

The bridge should not wait to be asked for status. Every non-trivial sortie should be decomposed into a visible Flight Path: a short roadmap of missions with live state.

```text
+-----------------------------------------------------------------------------+
|  ___ _    ___ ___ _  _ _____   ___   _ _____ _  _                           |
| | __| |  |_ _/ __| || |_   _| | _ \ /_\_   _| || |                          |
| | _|| |__ | | (_ | __ | | |   |  _// _ \| | | __ |                          |
| |_| |____|___\___|_||_| |_|   |_| /_/ \_\_| |_||_|                          |
+-----------------------------------------------------------------------------+
|  _  _ _   _ ___                                                             |
| | || | | | |   \                                                            |
| | __ | |_| | |) |                                                           |
| |_||_|\___/|___/                                                            |
+-----------------------------------------------------------------------------+
| MISSION 01 | DONE   | Scope locked. Contracts confirmed.                    |
| MISSION 02 | ACTIVE | Implementation burn in progress.                      |
| MISSION 03 | QUEUED | Verification and review gate standing by.             |
| MISSION 04 | QUEUED | Docs and operator handoff.                            |
+-----------------------------------------------------------------------------+
| _____ ___ _    ___ __  __ ___ _____ ___ ___   __                            |
||_   _| __| |  | __|  \/  | __|_   _| _ \ _ \ / /                            |
|  | | | _|| |__| _|| |\/| | _|  | | |   /   / > <                             |
|  |_| |___|____|___|_|  |_|___| |_| |_|_\_|_\/_/\_\                           |
+-----------------------------------------------------------------------------+
| NOW   | Implementation wing is moving on the active burn.                  |
| NEXT  | Review gate activates after Mission 02 clears.                     |
| RISKS | Contract drift or blocked dependencies bend the vector.            |
+-----------------------------------------------------------------------------+
```

When `missionControl.breakWorkIntoMissions` is enabled in `.mesh/config.json`, this HUD should appear automatically in commander-facing replies and refresh after each meaningful work batch. When `missionControl.reportStyle` is `ascii-command-deck`, reports should use ASCII-only boxed modules, aligned columns, and operational wording instead of casual prose. When `missionControl.headerStyle` is `ascii-art`, the major deck headers should render as compact ASCII banners rather than plain text labels. The Commander should always know what is active, what is next, and what is blocked without needing a separate status request.

---

## Phase 7 — Ceremonies

The bridge runs two structured alignment events. They fire automatically based on conditions — no scheduling required.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  CEREMONY MANIFEST                                                         │
├───────────────────┬─────────────────────────────────────────────────────────┤
│  DESIGN REVIEW    │  Fires BEFORE multi-agent work that touches shared     │
│                   │  systems. The crew agrees on interfaces, contracts,    │
│                   │  and risk before anyone fires thrusters.               │
├───────────────────┼─────────────────────────────────────────────────────────┤
│  RETROSPECTIVE    │  Fires AFTER a build failure, test failure, or         │
│                   │  reviewer rejection. Facts first. Root cause second.   │
│                   │  Action items third. No blame. Only signal.            │
├───────────────────┴─────────────────────────────────────────────────────────┤
│  Both ceremonies are lead-facilitated, time-boxed, and logged to the       │
│  Black Box. You may add custom ceremonies in .mesh/ceremonies.md.          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 8 — The HALT Sentinel

Every bridge needs a kill switch. This is yours.

When the HALT Sentinel is active, the entire mesh freezes. No agent spawns. No write operations. No deployments. The hull goes cold. You are the only one who can release it.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  HALT SENTINEL                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ACTIVATION                                                                │
│  ──────────                                                                │
│  Set "halted": true in .mesh/config.json, or tell the bridge:             │
│  > "HALT."                                                                 │
│                                                                            │
│  EFFECT                                                                    │
│  ──────                                                                    │
│  All agent spawns frozen.                                                  │
│  All write operations frozen.                                              │
│  All deployments frozen.                                                   │
│  Telemetry continues (read-only).                                          │
│  Black Box continues recording (the halt itself is logged).                │
│                                                                            │
│  RELEASE                                                                   │
│  ───────                                                                   │
│  Tier-1 Commander sets "halted": false, or tells the bridge:              │
│  > "Release HALT."                                                         │
│                                                                            │
│  The mesh thaws. Wings resume from last known state.                       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

Use it when the drift exceeds tolerance. Use it when an agent produces output you do not trust. Use it when you need to think. The mesh waits. It does not judge.

---

## Phase 9 — Scaling the Mesh

As missions grow in complexity, the bridge can evolve from a flat crew into a departmental structure.

Set `orgMode: true` in `config.json`. Wings become formal departments — each with a lead, a backlog, a state file, and optional cross-department contracts. The mesh goes from a single gravity well to a constellation of them.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLAT CREW vs. ORG MODE                                                    │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  FLAT CREW (orgMode: false)  │  ORG MODE (orgMode: true)                   │
│  ────────────────────────────│──────────────────────────────────────────    │
│  Single routing table        │  Departmental routing with leads             │
│  All agents report to bridge │  Leads decompose and prioritize locally     │
│  Direct claim-and-execute    │  Queue → claim → execute → review           │
│  Airbridges as needed        │  Contract-first cross-department work       │
│  Good for small missions     │  Built for multi-domain campaigns           │
│                              │                                              │
├──────────────────────────────┴──────────────────────────────────────────────┤
│  You can switch modes at any time. The mesh reforms. No reorg required.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Full Sequence

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMANDER ONBOARDING TIMELINE                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  PHASE 0   Cold Hull ··········· Read the Flight Path. Scan the hull.     │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 1   First Light ········· Claim Tier-1. Declare the mission.       │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 2   Crew Assembly ······· Review and confirm the proposed roster.  │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 3   Shadowing ··········· Agents observe. Build context. No writes.│
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 4   Probation Burns ····· Agents execute under review. You correct.│
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 5   Fire Thrusters ····· Full autonomy within charters. You lead. │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 6   Read the Drift ····· Telemetry. Correction. Telemetry.        │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 7   Ceremonies ·········· Design reviews before. Retros after.     │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 8   HALT (as needed) ··· Freeze when drift exceeds tolerance.     │
│       │                                                                    │
│       ▼                                                                    │
│  PHASE 9   Scale ··············· orgMode: true when the mission demands.  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║    END TRANSMISSION                                                        ║
║                                                                            ║
║    The bridge is yours, Commander.                                         ║
║    The mesh awaits your intent.                                            ║
║                                                                            ║
║    Drift. Converge. Ship.                                                  ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
