# Client Compatibility

Mercury Mesh supports multiple GitHub Copilot surfaces. The coordinator must detect the active surface and adapt spawning, result collection, and logging behavior to match the available tools.

## Supported Surfaces

| Surface | Spawn Tool | Result Collection | Notes |
|---------|------------|-------------------|-------|
| GitHub Copilot CLI | `task` | `read_agent` | Full spawn controls, per-spawn model selection, and `sql` are available. |
| GitHub Copilot in VS Code | `runSubagent` or `agent` | Inline subagent responses | No `read_agent`, no per-spawn model parameter, no `sql` tool. |
| Other / fallback surfaces | None | Inline work only | If no spawn tool exists, work inline without pretending an agent was spawned. |

## Platform Detection

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
- Spawn Scribe in the background when appropriate.

### VS Code Mode

- Use `runSubagent` or `agent` with the full prompt.
- Do not pass CLI-only parameters such as `agent_type`, `mode`, or `model`.
- Collect results from the returned subagent response rather than `read_agent`.
- Batch Scribe as the last subagent in a parallel group.

### Fallback Mode

- Execute the work inline.
- Do not claim that an agent was spawned.
- Avoid any workflow that depends on `task`, `read_agent`, or `sql`.

## Cross-Surface Rules

- Never hard-require `task` in generic instructions.
- Never call `read_agent` outside CLI mode.
- Never rely on `sql` for workflows that must run in VS Code.
- Keep prompts surface-independent even when spawn parameters differ.
- Treat Scribe behavior as surface-specific: background on CLI, final batched subagent on VS Code, inline when no spawn tool exists.

## Source of Truth

The implementation details are mirrored in these runtime files:

- `.copilot/skills/client-compatibility/SKILL.md`
- `.github/agents/mercury-mesh.agent.md`
- `.mesh/templates/mercury-mesh.agent.md`
