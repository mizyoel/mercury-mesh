---
name: "client-compatibility"
description: "Platform detection and adaptive spawning for CLI vs VS Code vs other surfaces"
domain: "orchestration"
confidence: "high"
source: "extracted"
---

## Context

Mercury Mesh runs on multiple Copilot surfaces (CLI, VS Code, JetBrains, GitHub.com). The coordinator must detect its platform and adapt spawning behavior accordingly. Different tools are available on different platforms, requiring conditional logic for agent spawning, SQL usage, and response timing.

## Patterns

### Platform Detection

Before spawning agents, determine the platform by checking available tools:

1. **CLI mode** — `task` tool is available → full spawning control. Use `task` with `agent_type`, `mode`, `model`, `description`, `prompt` parameters. Collect results via `read_agent`.

2. **VS Code mode** — `runSubagent` or `agent` tool is available → conditional behavior. Use `runSubagent` with the task prompt. Drop `agent_type`, `mode`, and `model` parameters. Multiple subagents in one turn run concurrently (equivalent to background mode). Results return automatically — no `read_agent` needed.

3. **Fallback mode** — neither `task` nor `runSubagent`/`agent` available → work inline. Do not apologize or explain the limitation. Execute the task directly.

If both `task` and `runSubagent` are available, prefer `task` (richer parameter surface).

### VS Code Spawn Adaptations

When in VS Code mode, the coordinator changes behavior in these ways:

- **Spawning tool:** Use `runSubagent` instead of `task` only when the current surface exposes a real named agent for that batch. The prompt is the only required parameter — pass the full agent prompt (charter, identity, task, hygiene, response order) exactly as you would on CLI. Never send implementation work to `Explore`; it remains a read-only scout. If no real named writable agent exists for the batch, switch the model picker as needed and execute the batch inline instead.
- **Parallelism:** Spawn ALL concurrent agents in a SINGLE turn. They run in parallel automatically. This replaces `mode: "background"` + `read_agent` polling.
- **Model selection workaround:** VS Code exposes no per-spawn `model` parameter. Resolve the desired model for each pending work item from `.mesh/config.json`, group pending subagents and inline fallback tasks by resolved model, and run one batch per model. Launch all real named agents that resolve to the same model in the same turn. Before moving to a batch with a different resolved model, prompt the user to switch the VS Code model picker to that model and wait for confirmation. Add a `## Model Routing` block to each prompt so the subagent can report whether the active batch matches the requested route. If no real named writable agent exists for a work item in that batch, execute it inline after the switch rather than routing it to Explore.
- **Scribe:** Cannot fire-and-forget. Batch Scribe as the LAST subagent in any parallel group. Scribe is light work (file ops only), so the blocking is tolerable.
- **Launch table:** Skip it. Results arrive with the response, not separately. By the time the coordinator speaks, the work is already done.
- **`read_agent`:** Skip entirely. Results return automatically when subagents complete.
- **`agent_type`:** Drop it. All VS Code subagents have full tool access by default. Subagents inherit the parent's tools.
- **`description`:** Drop it. The agent name is already in the prompt.
- **Prompt content:** Keep ALL prompt structure — charter, identity, task, hygiene, response order blocks are surface-independent.
- **Parallelism:** Only parallelize inside the active model batch. Do not mix routes that resolve to different models in the same turn, and do not simulate multi-Wing fan-out by spawning unnamed copies of the coordinator.
- **Model selection:** Never promise per-spawn enforcement on VS Code. Promise only that the coordinator will honor config by batching work per resolved model and asking the user to switch the model picker between batches when needed.
- **Scribe:** Keep Scribe in the final batch for its resolved model. If Scribe routes to a different model than the implementation batch, prompt for the switch before spawning it.

### Feature Degradation Table

| Feature | CLI | VS Code | Degradation |
|---------|-----|---------|-------------|
| Parallel fan-out | `mode: "background"` + `read_agent` | Multiple subagents in one turn | None — equivalent concurrency |
| Model selection | Per-spawn `model` param (4-layer hierarchy) | Config-driven model batches with manual model-picker switches | Manual batch boundaries when routes diverge; some batches may fall back to inline execution |
| Scribe fire-and-forget | Background, never read | Sync, must wait | Batch with last parallel group |
| Launch table UX | Show table → results later | Skip table → results with response | UX only — results are correct |
| SQL tool | Available | Not available | Avoid SQL in cross-platform code paths |
| Response order bug | Critical workaround | Possibly necessary (unverified) | Keep the block — harmless if unnecessary |

### SQL Tool Caveat

The `sql` tool is **CLI-only**. It does not exist on VS Code, JetBrains, or GitHub.com. Any coordinator logic or agent workflow that depends on SQL (todo tracking, batch processing, session state) will silently fail on non-CLI surfaces. Cross-platform code paths must not depend on SQL. Use filesystem-based state (`.mesh/` files) for anything that must work everywhere.

## Examples

**Example 1: CLI parallel spawn**
```typescript
// Coordinator detects task tool available → CLI mode
// Models were resolved from .mesh/config.json before these spawns
task({ agent_type: "general-purpose", mode: "background", model: resolvedFromConfig.code, ... })
task({ agent_type: "general-purpose", mode: "background", model: resolvedFromConfig.docs, ... })
// Later: read_agent for both
```

**Example 2: VS Code named read-only spawn**
```typescript
// Coordinator detects runSubagent available → VS Code mode
runSubagent({ agentName: "Explore", prompt: "...Scout repo state..." })
// Results return automatically, no read_agent
```

**Example 3: VS Code same-model batch**
```typescript
// Resolved routes for two real named writable agents both map to gpt-5.4
runSubagent({ agentName: "<real-available-agent-a>", prompt: "...## Model Routing\nrequested_model: gpt-5.4\nroute_source: modelRouting.taskTypes.code\nbatch_model_match: true..." })
runSubagent({ agentName: "<real-available-agent-b>", prompt: "...## Model Routing\nrequested_model: gpt-5.4\nroute_source: modelRouting.taskTypes.code\nbatch_model_match: true..." })
```

**Example 4: VS Code inline fallback batch**
```typescript
// No real named writable agent exists for the implementation batch on this surface
// Coordinator asks user to switch the model picker, records the same Model Routing metadata, and executes the batch inline instead of sending it to Explore
```

## Anti-Patterns

- ❌ Using SQL tool in cross-platform workflows (breaks on VS Code/JetBrains/GitHub.com)
- ❌ Mixing two resolved model routes into the same VS Code batch
- ❌ Claiming a configured route was enforced on VS Code without asking for a model-picker switch when batches diverge
- ❌ Sending implementation work to Explore merely to satisfy the spawn rule
- ❌ Calling `runSubagent` without `agentName` and treating it as a specialist handoff
- ❌ Fire-and-forget Scribe on VS Code when no real named Scribe agent exists
- ❌ Showing launch table on VS Code (results already inline)
- ❌ Apologizing or explaining platform limitations to the user
- ❌ Using `task` when only `runSubagent` is available
- ❌ Dropping prompt structure (charter/identity/task) on non-CLI platforms
