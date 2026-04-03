# Bridge Routing

How the Mesh decides who handles what. Missions act as gravity wells — the routing table pulls the right Wings into orbit.

## Nervous System Routing (Primary)

When the nervous system is online (`config.json` → `nervousSystem.enabled: true`), triage uses **Semantic Gravimetry** — intent-based gravitational routing that replaces keyword matching.

### How Semantic Gravimetry Works

1. Each Wing's domain, keywords, and authority scope are embedded into a high-dimensional signature vector.
2. When a Sortie arrives, its title and body are projected into the same space.
3. Cosine similarity between the Sortie vector and all Wing vectors produces a **gravity field**.
4. The gravity field determines the routing decision:

| Gravity Pattern | Decision | Description |
|----------------|----------|-------------|
| Single Wing ≥ 70% gravity share | **Direct route** | One Wing is the clear attractor |
| Multiple Wings each ≥ 20% share | **Airbridge** | Gravity is distributed — temporary cross-Wing link formed |
| No Wing ≥ 15% similarity | **Void** | Sortie enters uncharted space — Ghost Wing synthesis may trigger |

### Embedding Providers

| Provider | Config Value | Description |
|----------|-------------|-------------|
| TF-IDF (built-in) | `"tfidf"` | Zero-dependency fallback. Uses term frequency–inverse document frequency vectors. |
| OpenRouter | `"openrouter"` | OpenRouter embeddings API. Set `nervousSystem.embeddingApiKey` in `.mesh/local.json` (git-ignored by the CLI scaffold). |

Compatibility note: `"llm"` remains available as a legacy alias for the older OpenAI-compatible endpoint path.

### Gravity Thresholds

Tunable in `config.json` → `nervousSystem.gravimetry`:

| Threshold | Default | Effect |
|-----------|---------|--------|
| `minimumGravity` | `0.15` | Minimum similarity for a Wing to exert any pull |
| `airbridgeThreshold` | `0.70` | If top Wing captures ≥ this share, route directly (no Airbridge) |
| `airbridgeMinShare` | `0.20` | Minimum gravity share to participate in an Airbridge |

### Ghost Wing Synthesis

When a Sortie falls into the Void (no Wing resonates), the nervous system can synthesize a **Ghost Wing** — a temporary department with auto-generated charter, backlog, and state files.

Ghost Wing lifecycle: `synthesis → probation → [solidify | dissolve]`

- **Solidify:** After N successful tasks, the Ghost Wing becomes permanent topology.
- **Dissolve:** After N failures or lifespan expiry, the Ghost Wing is archived and dissolved.
- **Config:** `nervousSystem.ghostWings` controls thresholds and auto-materialization.

### Constellation Memory (RAG)

Every routing decision, Ghost Wing outcome, and Black Box entry is embedded into the Constellation — a spatial memory index. When a new Sortie arrives, the Constellation is queried for structural resonance, and matching tactical context is pre-loaded into Wing context windows.

Stored at: `.mesh/nervous-system/constellation/`

## Keyword Routing (Fallback)

When the nervous system is offline, uncalibrated, or encounters an error, triage falls back to the keyword-based routing table below. This is the original routing mechanism and remains fully operational.

### Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| {domain 1} | {Name} | {example tasks} |
| {domain 2} | {Name} | {example tasks} |
| {domain 3} | {Name} | {example tasks} |
| Code review | {Name} | Review PRs, check quality, suggest improvements |
| Testing | {Name} | Write tests, find edge cases, verify fixes |
| Scope & priorities | {Name} | What to build next, trade-offs, decisions |
| The Black Box | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `Mercury Mesh` | Triage: analyze issue, assign `Mercury Mesh:{member}` label | Lead |
| `Mercury Mesh:{name}` | Pick up issue and complete the work | Named member |
| `dept:{department}` | Add routing metadata for org-mode triage | Coordinator + workflows |

Legacy label note: the bridge keeps `Mercury Mesh` and `Mercury Mesh:{member}` labels until workflow automation is migrated. Treat them as compatibility labels, not product language.

### How Issue Assignment Works

1. When a GitHub issue gets the `Mercury Mesh` label, the **Lead** triages it as the bridge inbox — analyzing content, assigning the right `Mercury Mesh:{member}` label, and commenting with telemetry notes.
2. When a `Mercury Mesh:{member}` label is applied, that member picks up the issue in their next sortie.
3. `dept:{department}` labels are additive metadata only. They never replace `Mercury Mesh:{member}` as the workflow trigger.
4. Members can reassign by removing their label and adding another member's label.
5. The `Mercury Mesh` label is the gravity well for untriaged issues waiting for Lead triage.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → Ship's Computer answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `Mercury Mesh:{member}` label is applied to an issue, route to that member. The Lead handles all `Mercury Mesh` (base label) triage.

## Hierarchical Routing (Org Mode)

Active when `orgMode: true` in `.mesh/config.json`. When disabled, all routing falls back to the flat rules above.

### Department Routing

| Department | Lead | Members | Domain Keywords |
|------------|------|---------|-----------------|

### Department Runtime Rules

1. **Supervised autonomy** — the Ship's Computer remains the control plane. Department leads may decompose and prioritize local work, but all actual agent spawns still flow through the coordinator.
2. **Queue before execution** — when work lands in a department, the lead may convert it into work packets in `.mesh/org/{department}/backlog.md` before members begin execution.
3. **Claim before work** — a member may only start a packet that is `queued` and unclaimed.
4. **Lease every claim** — claimed work must record an owner and lease expiry in `.mesh/org/{department}/state.json`.
5. **Re-queue stale work** — expired claims return to `queued` when allowed by config.
6. **Contract-first cross-department work** — if two departments depend on one another, define or update a contract in `.mesh/org/contracts/` before parallel execution.
7. **Lead review on probation or conflict** — probationary outputs and cross-department conflicts route to the department lead before coordinator synthesis.

### Autonomous Department Loop

1. Coordinator routes the mission to the relevant Wing or Deck lead.
2. Lead decomposes it into local packets — the Burn begins.
3. Coordinator fans out independent packets to eligible members in parallel.
4. Members update backlog and state via the drop-box pattern and department state files.
5. Lead resolves local blockers; unresolved blockers escalate to coordinator via Airbridge.
