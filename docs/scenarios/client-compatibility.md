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

- Use `runSubagent` or `agent` only when you can target a real named agent.
- Use `agentName: "Explore"` ONLY for genuine read-only scouting (codebase questions, analysis, file discovery). Do NOT route implementation work through Explore.
- If `agentName` is omitted, VS Code reuses the current agent instead of launching a distinct Wing.
- For implementation, review, or logging work, execute inline: read the assigned agent's charter and history, adopt their role context, and do the task directly as the coordinator acting on behalf of that agent.
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
- Keep prompts surface-independent even when spawn parameters differ.
- Treat Scribe behavior as surface-specific: background on CLI, inline on VS Code unless a real named Scribe exists, inline when no spawn tool exists.

## Source of Truth

The implementation details are mirrored in these runtime files:

- `.copilot/skills/client-compatibility/SKILL.md`
- `.github/agents/mercury-mesh.agent.md`
- `.mesh/templates/mercury-mesh.agent.md`
