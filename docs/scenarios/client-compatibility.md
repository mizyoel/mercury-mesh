# Client Compatibility

Mercury Mesh runs across multiple GitHub Copilot surfaces. The bridge must detect the active surface and adapt spawning, result collection, and logging behavior to the tools actually on the console.

## Supported Surfaces

| Surface | Spawn Tool | Result Collection | Notes |
|---------|------------|-------------------|-------|
| GitHub Copilot CLI | `task` | `read_agent` | Full spawn controls, per-spawn model selection, and `sql` are available. |
| GitHub Copilot in VS Code | `runSubagent` or `agent` | Inline subagent responses | No `read_agent`, no per-spawn model parameter, no `sql` tool. Unnamed `runSubagent` reuses the current agent. |
| Other / fallback surfaces | None | Inline work only | If no spawn tool exists, work inline and never claim a Wing launched when nothing launched. |

## Surface Detection

Determine the active surface by checking the available tools in this order:

1. If `task` is available, use CLI mode.
2. Otherwise, if `runSubagent` or `agent` is available, use VS Code mode.
3. Otherwise, fall back to inline execution.

If both CLI and VS Code spawn tools appear to be available, prefer `task` because it exposes the richer control surface.

## Behavior Differences

### CLI Mode

- Use `task` with `agent_type`, `mode`, `model`, `description`, and `prompt`.
- Collect background results with `read_agent`.
- Use `sql` only in CLI-specific workflows.
- Spawn Scribe in the background when the burn warrants it.

### VS Code Mode

- Use `runSubagent` or `agent` with the task prompt. Drop `agent_type`, `mode`, and `model` parameters.
- Multiple subagents in one turn run concurrently (equivalent to background mode).
- Resolve `modelRouting` from `.mesh/config.json`, group pending subagent work by resolved model, and run one model batch at a time.
- Before each batch whose resolved model differs from the current VS Code session model, prompt the user to switch the model picker and wait for confirmation.
- Add a `## Model Routing` block to each subagent prompt so the batch can report the intended model and whether the active batch matched it.
- If the current surface has no real named writable agent for a work item in that batch, execute it inline after the model-picker switch instead of routing it to Explore.
- Batch Scribe as the last subagent in any parallel group.
- Do not pass CLI-only parameters such as `agent_type`, `mode`, or `model`.
- Collect results from the returned subagent response rather than `read_agent`.

### Fallback Mode

- Execute the work inline.
- Do not claim that an agent was spawned.
- Avoid any workflow that depends on `task`, `read_agent`, or `sql`.

## Cross-Surface Rules

- Never hard-require `task` in generic instructions.
- Never call `read_agent` outside CLI mode.
- Never rely on `sql` for workflows that must run in VS Code.
- Never treat unnamed `runSubagent` calls as specialist launches.
- Never mix pending subagents that resolve to different models into the same VS Code batch.
- Never send implementation work to `Explore` just to satisfy the spawn rule.
- Keep prompts surface-independent even when spawn parameters differ.
- Treat Scribe behavior as surface-specific: background on CLI, sync (batched last) on VS Code, inline when no spawn tool exists.

## Source of Truth

The implementation details are mirrored in these runtime files:

- `.copilot/skills/client-compatibility/SKILL.md`
- `.github/agents/mercury-mesh.agent.md`
- `.mesh/templates/mercury-mesh.agent.md`
