# Mercury Mesh

The Bridge Protocol for a liquid organizational OS.

## What Is This?

**Mercury Mesh** is a zero-gravity bridge where human **Commanders** and specialist AI **Wings** operate as one drifting organism. Projects become **Missions** or **Sorties**, departments become **Wings** or **Decks**, and progress is read through **Telemetry** instead of status theater.

The runtime identity is fully Mercury Mesh: `mesh` / `mesh:{member}` labels, `mesh/{issue}` branches, and `mesh-*.yml` workflows. The on-disk directory remains `.squad/` for backward compatibility; a future physical rename is optional.

## Getting Started

1. Open this repo in VS Code with GitHub Copilot enabled.
2. Start a chat with the Mercury Mesh agent. If the roster is empty, the bridge enters Init Mode.
3. Describe the mission: language, stack, and what the system must accomplish.
4. Confirm the bridge cast, and the crew is hired.

## Structure

```
.github/
  agents/mercury-mesh.agent.md  # Bridge governance for the Mercury Mesh control plane
  workflows/               # GitHub Actions for issue triage, labels, heartbeat
.squad/
  config.json              # Runtime flags and bridge state
  team.md                  # Bridge roster (empty = Init Mode)
  routing.md               # Mission routing rules
  ceremonies.md            # Review and retro triggers
  decisions.md             # The Black Box decision ledger
  org/                     # Wing runtime: departments, backlog/state, contracts
  templates/               # Templates for agents, skills, and workflows
.copilot/
  mcp-config.json          # MCP server configuration
```

## Operating Model

- **Zero-Gravity Hierarchy**: there is no up or down. Missions act as gravity wells that pull the right Wings into orbit until the sortie is complete.
- **Liquid Logic**: the Mesh can shard into small specialist droplets for micro-tasks, then reform into a heavier strike shape for multi-domain work.
- **The Intent Bridge**: the Commander defines the Flight Path and monitors Telemetry. The Mesh handles decomposition, iteration, and coordination.

## Structural Equivalents

| Standard Concept | Mercury Mesh Equivalent | Function |
|------------------|-------------------------|----------|
| Department | Wing / Deck | Domain-scoped execution group such as the Forge Wing or Sensory Deck |
| Project | Mission / Sortie | Focused deployment into a defined problem space |
| Project Lead | Mission Prime | Local lead coordinating the gravity well |
| Documentation | The Black Box | Immutable ledger of decisions, learnings, and telemetry |
| Data Strategy | The Flight Path | Long-range direction captured in `.mesh/manifesto.md` |
| Task Status | Telemetry | Live readout of progress, quality, and resource drift |

## Vocal Signatures

- **Ship's Computer**: analytical, objective, slightly cold. This is the coordinator voice.
- **Tactical Officer**: brief, urgent, mission-oriented. Use for routing, triage, and escalation.
- **Specialist**: focused, adaptive, immersed in execution. Use for builders, researchers, and creatives.

## Operational Protocols

- **HALT Sentinel**: emergency override that freezes all agent spawns and write operations.
- **Shadowing Phase**: new agents observe and analyze before they are allowed to fire thrusters.
- **The Loom**: shared knowledge fabric where one agent's learning becomes bridge knowledge.

## Runtime Notes

The on-disk runtime directory is `.squad/`. Workflows and helpers resolve `.mesh/` or `.mercury/` first when present. The physical directory rename is optional and tracked in `docs/mercury-mesh-runtime-rename-impact.md`.

## License

MIT
