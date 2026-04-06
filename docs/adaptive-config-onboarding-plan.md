```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║    █████╗ ██████╗  █████╗ ██████╗ ████████╗██╗██╗   ██╗███████╗           ║
║   ██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██║██║   ██║██╔════╝           ║
║   ███████║██║  ██║███████║██████╔╝   ██║   ██║██║   ██║█████╗             ║
║   ██╔══██║██║  ██║██╔══██║██╔═══╝    ██║   ██║╚██╗ ██╔╝██╔══╝             ║
║   ██║  ██║██████╔╝██║  ██║██║        ██║   ██║ ╚████╔╝ ███████╗           ║
║   ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝        ╚═╝   ╚═╝  ╚═══╝  ╚══════╝           ║
║                                                                            ║
║    C O N F I G   O N B O A R D I N G   D E V E L O P M E N T   P L A N    ║
║    Project-Complexity-Aware Bridge Activation                             ║
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
│  RE       :: ADAPTIVE CONFIG ONBOARDING PLAN                               │
│  CLASS    :: UX / CLI / CONFIGURATION                                      │
│  PRIORITY :: HIGH                                                          │
│  VERSION  :: 0.1.0-draft                                                   │
│  DATE     :: 2026-04-06                                                    │
│                                                                            │
│  The bridge should not hand raw switches to a cold Commander.              │
│  It should read the hull, recommend posture, and ask only what matters.    │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Table of Contents

1. [Objective](#1-objective)
2. [Problem Statement](#2-problem-statement)
3. [Desired Outcome](#3-desired-outcome)
4. [Guiding Principles](#4-guiding-principles)
5. [User Experience Model](#5-user-experience-model)
6. [Complexity Detection Model](#6-complexity-detection-model)
7. [Configuration Profiles](#7-configuration-profiles)
8. [Recommendation Engine](#8-recommendation-engine)
9. [CLI Surface Changes](#9-cli-surface-changes)
10. [Implementation Plan](#10-implementation-plan)
11. [Data Model Changes](#11-data-model-changes)
12. [Telemetry & Doctor Advisories](#12-telemetry--doctor-advisories)
13. [Safety Rules](#13-safety-rules)
14. [Test Plan](#14-test-plan)
15. [Rollout Phases](#15-rollout-phases)
16. [Success Criteria](#16-success-criteria)
17. [Open Questions](#17-open-questions)

---

## 1. Objective

Design and implement an **adaptive configuration onboarding system** that lets Mercury Mesh:

1. Inspect a repository at init time.
2. Infer a likely operating complexity.
3. Recommend a safe configuration profile.
4. Ask the Commander only the few questions that materially affect bridge behavior.
5. Avoid exposing cold users to a wall of low-level config flags.

The end state is not a settings form. It is a **bridge interview**.

---

## 2. Problem Statement

Today, Mercury Mesh scaffolds a static `config.json` with conservative defaults. This is safe, but it produces three operational problems:

| Problem | Effect |
|---------|--------|
| **Flat defaults for all repos** | A tiny solo repo and a multi-stream platform repo receive the same initial posture. |
| **Feature discovery burden** | Commanders must understand config flags like `autoMaterialize`, `orgMode`, and `vanguard.enabled` before they know whether those controls matter. |
| **No context-aware tuning loop** | The bridge does not currently inspect repo shape, workload complexity, or autonomy risk before deciding what to recommend. |

The result is unnecessary friction at activation time and suboptimal defaults after activation.

---

## 3. Desired Outcome

At init time, the bridge should be able to say something like:

```text
  HULL PROFILE DETECTED :: MEDIUM TEAM REPOSITORY

  RECOMMENDED POSTURE
  - orgMode                 ENABLE
  - nervousSystem           ENABLE
  - ghostWings             ENABLE
  - autoMaterialize        KEEP MANUAL
  - vanguard               KEEP OFF

  COMMAND OPTIONS
  [1] Accept recommendation
  [2] Review each setting
  [3] Start conservative
```

The Commander should be guided into a sane configuration in under 60 seconds.

---

## 4. Guiding Principles

1. **Ask about intent, not raw flags.** Commanders should answer mission questions, not decode internal schema names.
2. **Recommend before asking.** The bridge should first analyze the hull and present a default posture.
3. **Conservative by default.** Features that create topology, spend budget, or alter authority must remain opt-in.
4. **Never silently raise autonomy.** `autoMaterialize`, `vanguard.enabled`, and future self-expanding features always require explicit Commander approval.
5. **Keep init short.** The interview must remain tight. If too many questions are needed, defer the rest to a later tuning command.

---

## 5. User Experience Model

### 5.1 Init Flow

The new init flow becomes a four-stage sequence:

```text
  INIT
    │
    ▼
  Scan repository shape
    │
    ▼
  Infer complexity profile
    │
    ▼
  Present recommended posture
    │
    ├── Accept recommendation
    ├── Review high-impact settings
    └── Start conservative
```

### 5.2 Question Strategy

Questions must be high-signal and low-count. Examples:

1. Is this primarily a prototype, an internal tool, or a long-lived system?
2. How many people or parallel workstreams regularly touch this repo?
3. Should the bridge only coordinate existing structure, or also propose and form new structure?
4. Is this environment safe for experimental autonomy?

### 5.3 Escalation Strategy

If the repo is clearly simple, the bridge should ask fewer questions. If the repo is large, operationally risky, or structurally ambiguous, the bridge should ask more and bias conservative.

---

## 6. Complexity Detection Model

The bridge should infer a **complexity score** from repository signals before asking anything.

### 6.1 Signals

| Signal | What it indicates |
|--------|-------------------|
| File count / directory breadth | System size |
| Multiple package roots (`packages/`, `apps/`, workspaces) | Monorepo / multi-stream complexity |
| Language diversity | Cross-domain coordination burden |
| CI/CD and deployment workflows | Operational risk |
| Infra folders (`terraform/`, `docker/`, `k8s/`) | Production adjacency |
| Contributor / branch churn | Team scale |
| Existing `.mesh/org/` topology | Prior need for structured orchestration |
| Existing Void / Ghost activity | Need for adaptive routing support |

### 6.2 Complexity Bands

| Band | Meaning |
|------|---------|
| `light` | Solo or low-ceremony repo |
| `medium` | Team repo with moderate parallelism |
| `heavy` | Multi-stream or high-coordination repo |
| `experimental` | Innovation-heavy R&D environment |

### 6.3 Detection Output

Detection should produce a structured object such as:

```json
{
  "profile": "medium",
  "confidence": "high",
  "signals": {
    "monorepo": false,
    "deploymentRisk": true,
    "parallelismIndicators": 3,
    "languageCount": 2
  },
  "reasons": [
    "Multiple active workflows detected",
    "Operational deployment surface present",
    "Repository structure suggests team coordination load"
  ]
}
```

---

## 7. Configuration Profiles

### 7.1 Light Profile

Recommended for solo, low-complexity projects.

```jsonc
{
  "orgMode": false,
  "nervousSystem": { "enabled": true },
  "ghostWings": { "enabled": true, "autoMaterialize": false },
  "vanguard": { "enabled": false }
}
```

### 7.2 Medium Profile

Recommended for team repos with moderate routing and handoff needs.

```jsonc
{
  "orgMode": true,
  "nervousSystem": { "enabled": true },
  "ghostWings": { "enabled": true, "autoMaterialize": false },
  "vanguard": { "enabled": false }
}
```

### 7.3 Heavy Profile

Recommended for monorepos, platform repos, or high-parallelism workstreams.

```jsonc
{
  "orgMode": true,
  "nervousSystem": { "enabled": true },
  "ghostWings": { "enabled": true, "autoMaterialize": false },
  "orgConfig": { "maxParallelismPerDepartment": 3 },
  "vanguard": { "enabled": false }
}
```

### 7.4 Experimental Profile

Recommended for R&D repos where novel-domain exploration is desirable.

```jsonc
{
  "orgMode": true,
  "nervousSystem": { "enabled": true },
  "ghostWings": { "enabled": true, "autoMaterialize": false },
  "vanguard": { "enabled": false }
}
```

Note: even in the experimental profile, `vanguard.enabled` stays off by default until explicit Commander approval.

---

## 8. Recommendation Engine

### 8.1 Decision Layers

The recommendation engine should operate in three layers:

1. **Repository inference** — determine likely complexity and risk posture.
2. **Profile resolution** — map the repo to a recommended baseline profile.
3. **Commander override interview** — ask only on settings that materially affect autonomy, structure creation, or experimental behavior.

### 8.2 High-Impact Settings

These settings warrant explicit prompt or confirmation:

| Setting | Why it must be explicit |
|---------|-------------------------|
| `nervousSystem.enabled` | Changes routing model and runtime behavior |
| `nervousSystem.ghostWings.enabled` | Allows emergent gap-filling topology |
| `nervousSystem.ghostWings.autoMaterialize` | Creates new runtime structure automatically |
| `orgMode` | Changes orchestration model |
| `vanguard.enabled` | Enables autonomous innovation subsystem |

### 8.3 Recommended CLI Wording

Prefer operational language over raw config names:

- Instead of `Enable orgMode?`
  Use: `Should the bridge coordinate work as a structured multi-department formation?`

- Instead of `Enable autoMaterialize?`
  Use: `When the Mesh detects an unclaimed domain, should it auto-form a Ghost Wing, or wait for your approval?`

- Instead of `Enable vanguard?`
  Use: `Should the Mesh be allowed to propose and stage autonomous innovation experiments?`

---

## 9. CLI Surface Changes

### 9.1 `init`

Extend init with a guided mode:

```text
npx mercury-mesh init
```

Behavior:

1. Scan repo.
2. Print detected profile.
3. Present recommendation.
4. Ask for approval or customization.
5. Write config accordingly.

Optional future flag:

```text
npx mercury-mesh init --conservative
npx mercury-mesh init --guided
npx mercury-mesh init --profile medium
```

### 9.2 `doctor`

Doctor should not only validate config syntax. It should detect posture mismatch.

Examples:

- Large coordination-heavy repo detected, but `orgMode` is off.
- Frequent Void activity detected, but Ghost Wings are disabled.
- Experimental repo signals detected, but `vanguard` is absent or never evaluated.

### 9.3 New Commands

Potential additions:

```text
npx mercury-mesh config recommend
npx mercury-mesh config tune
```

- `config recommend` analyzes the hull and prints recommended diffs.
- `config tune` reruns the interview after the repo evolves.

---

## 10. Implementation Plan

### Phase 1 — Repo Complexity Scanner

Build a scanner module that inspects the repository and emits a normalized complexity report.

Deliverables:

1. `detectRepoComplexity(targetRoot)` helper.
2. Structured output with profile, confidence, signals, and reasons.
3. Unit tests with small, medium, and monorepo fixtures.

### Phase 2 — Profile Resolver

Map scanner output to config recommendations.

Deliverables:

1. `resolveRecommendedProfile(scanResult)` helper.
2. Profile-to-config mapping table.
3. Human-readable recommendation summary generator.

### Phase 3 — Guided Init Interview

Integrate the scanner and profile resolver into `init`.

Deliverables:

1. Recommendation HUD in CLI output.
2. Commander choice flow: accept, customize, conservative.
3. Existing non-TTY behavior remains deterministic and safe.

### Phase 4 — Doctor Advisories

Extend doctor with advisory-grade findings.

Deliverables:

1. Complexity vs posture mismatch warnings.
2. Safety warnings for high-autonomy configs without Commander setup.
3. Suggested command output: `run 'mercury-mesh config tune'`.

### Phase 5 — Re-Tuning Commands

Add post-init tuning surfaces.

Deliverables:

1. `config recommend`
2. `config tune`
3. Optional `--json` output for machine consumption

---

## 11. Data Model Changes

### 11.1 Config Schema

No immediate schema expansion is required to ship a first version. The first implementation can operate by setting existing config keys.

Optional later addition:

```jsonc
{
  "onboarding": {
    "recommendedProfile": "medium",
    "recommendedAt": "2026-04-06T12:00:00Z",
    "recommendationConfidence": "high"
  }
}
```

This should be treated as informational metadata, not runtime logic.

### 11.2 Advisory Metadata

Doctor and status may also emit transient recommendation objects without persisting them.

---

## 12. Telemetry & Doctor Advisories

### 12.1 Telemetry Fields

Potential additions:

| Field | Description |
|-------|-------------|
| `onboarding.detectedProfile` | Last inferred repo profile |
| `onboarding.profileConfidence` | Confidence in that inference |
| `onboarding.postureMismatch` | Whether current config diverges from recommendation |

### 12.2 Advisory Classes

Suggested advisory codes:

| Code | Meaning |
|------|---------|
| `CFG-101` | Repo complexity exceeds conservative bridge posture |
| `CFG-102` | Ghost Wings likely beneficial based on repeated Void signals |
| `CFG-103` | Auto-materialization enabled without clear Commander staffing |
| `CFG-201` | Experimental repo signals suggest Vanguard evaluation |
| `CFG-301` | High-autonomy settings active without Tier-1 Commander claimed |

---

## 13. Safety Rules

The following rules are non-negotiable:

1. `autoMaterialize` must never be enabled silently.
2. `vanguard.enabled` must never be enabled silently.
3. Non-interactive init must resolve to conservative defaults.
4. High-risk repos must bias toward advisory prompts, not aggressive autonomy.
5. Missing Tier-1 Commanders should degrade recommendations toward caution.

---

## 14. Test Plan

### Unit Tests

1. Light repo fixture resolves to `light`.
2. Medium repo fixture resolves to `medium`.
3. Monorepo fixture resolves to `heavy`.
4. Experimental fixture resolves to `experimental`.
5. Recommendation engine maps each fixture to expected config outputs.

### CLI Tests

1. `init` on non-TTY falls back to conservative defaults.
2. `init` interactive flow accepts recommended profile.
3. `init` interactive flow allows per-setting override.
4. `doctor` emits posture advisory warnings when config mismatches repo complexity.

### Regression Tests

1. Existing `init` behavior remains stable for CI and scripted use.
2. Existing config migrations remain intact.
3. Existing HUD and doctor output remain readable when no recommendations are produced.

---

## 15. Rollout Phases

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ROLLOUT                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  PHASE 1   Complexity scanner + tests                                      │
│  PHASE 2   Profile resolver + recommendation renderer                      │
│  PHASE 3   Guided init interview                                           │
│  PHASE 4   Doctor advisories                                               │
│  PHASE 5   Post-init tuning commands                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

Ship order matters. Scanner and resolver must land before UX prompts grow in complexity.

---

## 16. Success Criteria

| Criterion | Target |
|-----------|--------|
| Init interview duration | ≤ 60 seconds for recommended-path setup |
| Commander questions | ≤ 5 high-signal prompts in standard flow |
| Non-interactive stability | Zero regressions in CI / scripted init |
| Recommendation usefulness | Recommended profile accepted in majority of guided init runs |
| Safety | Zero silent activation of topology-creating autonomy |

---

## 17. Open Questions

1. Should repo-complexity detection inspect git history by default, or only file structure?
2. Should `config recommend` write suggested diffs, or remain read-only?
3. Should the bridge persist a recommendation profile in config metadata, or keep it ephemeral?
4. Should status surface recommendations continuously, or only when drift from recommended posture grows significant?
5. Should experimental profile ever recommend `vanguard.enabled: true`, or must that remain a separate explicit ceremony forever?

---

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  END TRANSMISSION                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  DOCUMENT     :: ADAPTIVE CONFIG ONBOARDING PLAN                           │
│  STATUS       :: DRAFT                                                     │
│  NEXT BURN    :: IMPLEMENT PHASE 1 — COMPLEXITY SCANNER                   │
│                                                                            │
│  The bridge should meet the Commander where the hull actually is.          │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```