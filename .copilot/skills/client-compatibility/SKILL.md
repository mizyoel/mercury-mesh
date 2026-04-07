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

2. **VS Code mode** — `runSubagent` or `agent` tool is available → limited named-agent mode. Use `runSubagent` with `agentName: "Explore"` ONLY for genuine read-only scouting (questions, analysis, codebase exploration). For implementation, review, logging, or any task that creates/modifies artifacts, **do the work inline** — read the agent's charter and history, then execute the task yourself as the coordinator acting on behalf of that agent. Do NOT route implementation work through `Explore`. Drop CLI-only parameters such as `agent_type`, `mode`, and `model`. Results return automatically — no `read_agent` needed.

3. **Fallback mode** — neither `task` nor `runSubagent`/`agent` available → work inline. Do not apologize or explain the limitation. Execute the task directly.

If both `task` and `runSubagent` are available, prefer `task` (richer parameter surface).

### VS Code Spawn Adaptations

When in VS Code mode, the coordinator changes behavior in these ways:

- **Spawning tool:** `runSubagent` is named-agent only. If you omit `agentName`, VS Code reuses the current agent, which is recursive and does NOT create a distinct Wing. Use `agentName: "Explore"` ONLY for genuine read-only scouting (codebase questions, analysis, file discovery). For implementation, review, or logging tasks, **work inline**: read the assigned agent's charter, adopt their role context, and execute the task directly. The coordinator becomes the agent for that task. Do NOT send implementation work to Explore — Explore is read-only and will not produce artifacts.
- **Parallelism:** Only parallelize when you have multiple real named subagents on the surface. Do not simulate multi-Wing fan-out by spawning unnamed copies of the coordinator.
- **Model selection:** VS Code exposes no per-spawn model parameter. Inline work uses the session model. Named built-in agents may run on a platform-selected model outside repo control. Never promise a specific subagent model on VS Code.
- **Scribe:** Default to inline logging on VS Code. Only spawn Scribe if it exists as a real named agent on the current surface.
- **Launch table:** Skip it. Results arrive with the response, not separately. By the time the coordinator speaks, the work is already done.
- **`read_agent`:** Skip entirely. Results return automatically when subagents complete.
- **`agent_type`:** Drop it. All VS Code subagents have full tool access by default. Subagents inherit the parent's tools.
- **`description`:** Drop it. The agent name is already in the prompt.
- **Prompt content:** Keep ALL prompt structure — charter, identity, task, hygiene, response order blocks are surface-independent.

### Feature Degradation Table

| Feature | CLI | VS Code | Degradation |
|---------|-----|---------|-------------|
| Parallel fan-out | `mode: "background"` + `read_agent` | Named subagents only | Limited — avoid unnamed recursive spawns |
| Model selection | Per-spawn `model` param (4-layer hierarchy) | No per-spawn control | Session model for inline work; named agents may use platform-selected models |
| Scribe fire-and-forget | Background, never read | Inline unless a real named Scribe exists | Logging degrades to coordinator work |
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

**Example 3: VS Code implementation work**
```typescript
// No named specialist agent exists on this surface
// Coordinator executes the task inline instead of recursively spawning itself
```

**Example 4: Fallback mode**
```typescript
// Neither task nor runSubagent available → work inline
// Coordinator executes the task directly without spawning
```

## Anti-Patterns

- ❌ Using SQL tool in cross-platform workflows (breaks on VS Code/JetBrains/GitHub.com)
- ❌ Attempting per-spawn model selection on VS Code (Phase 1 — only session model works)
- ❌ Calling `runSubagent` without `agentName` and treating it as a specialist handoff
- ❌ Fire-and-forget Scribe on VS Code when no real named Scribe agent exists
- ❌ Showing launch table on VS Code (results already inline)
- ❌ Apologizing or explaining platform limitations to the user
- ❌ Using `task` when only `runSubagent` is available
- ❌ Dropping prompt structure (charter/identity/task) on non-CLI platforms
