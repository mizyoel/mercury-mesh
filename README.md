# Mercury Mesh

**Command the Drift.** The Fluid OS for autonomous operations.

## What Is This?

**Mercury Mesh** is the world's first Fluid Organizational Operating System (F-OS) — a zero-gravity bridge where human **Commanders** and specialist AI **Wings** operate as one drifting organism. Projects become **Missions** or **Sorties**, departments become **Wings** or **Decks**, and progress is read through **Telemetry** — not status theater.

The runtime identity is fully Mercury Mesh: `mesh` / `mesh:{member}` labels, `mesh/{issue}` branches, `mesh-*.yml` workflows, and `.mesh/` as the runtime directory.

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
.mesh/
  config.json              # Runtime flags and bridge state
  team.md                  # Bridge roster (empty = Init Mode)
  routing.md               # Mission routing rules
  ceremonies.md            # Review and retro triggers
  decisions.md             # The Black Box — immutable decision ledger
  org/                     # Wing runtime: departments, backlog/state, contracts
  templates/               # Templates for agents, skills, and workflows
.copilot/
  mcp-config.json          # MCP server configuration
```

## Operating Model

- **Zero-Gravity Architecture**: there is no up or down. Missions act as gravity wells that pull the right Wings into orbit until the sortie is complete.
- **The Liquid Interface**: the Mesh can shard into small specialist droplets for micro-tasks, then reform into a heavier strike shape for multi-domain work. Data and agent-logic flow like liquid metal.
- **The Intent Bridge**: the Commander defines the Flight Path and monitors Telemetry. The Mesh handles decomposition, iteration, and coordination.

## Structural Equivalents

| Standard Concept | Mercury Mesh Term | Function |
|------------------|-------------------|----------|
| Department | Wing / Deck | Domain-scoped execution group such as the Forge Wing or Sensory Deck |
| Project | Mission / Sortie | Focused deployment into a defined problem space |
| Project Lead | Mission Prime | Local lead coordinating the gravity well |
| Documentation | The Black Box | Immutable ledger of decisions, learnings, and telemetry |
| Roadmap | The Flight Path | Long-range direction captured in `.mesh/manifesto.md` |
| Task Status | Telemetry | Live, HUD-style readout of progress, quality, and resource drift |
| Alignment State | The Drift | Current state of organizational alignment — or deviation from it |
| High-Intensity Sprint | The Burn | Period of high-intensity execution within a sortie |
| Project Health | Hull Integrity | Health and quality of a project's output |
| Unknown Problem-Space | The Void | Competitive market or uncharted territory a mission enters |
| Cross-Team Sync | Airbridge | Temporary connection between two autonomous wings to share context |
| Knowledge Base | The Loom | Shared knowledge fabric — one wing's learning becomes bridge knowledge |

## Vocal Signatures

- **Ship's Computer**: analytical, objective, slightly cold. The coordinator voice — measured, exact, slightly austere.
- **Tactical Officer**: brief, urgent, mission-oriented. Use for routing, triage, and escalation — direct, momentum-forward, high-signal.
- **Specialist**: focused, adaptive, immersed in execution. Use for builders, researchers, and creatives.

## Operational Protocols

- **HALT Sentinel**: emergency override that freezes all agent spawns and write operations.
- **Shadowing Phase**: new agents observe and analyze before they are allowed to fire thrusters.
- **The Loom**: shared knowledge fabric where one agent's learning becomes bridge knowledge.
- **Airbridge**: temporary connection between two autonomous wings to share context.

## Runtime Notes

The runtime directory is `.mesh/`. Helpers also check `.mercury/` as an alternate. See `docs/mercury-mesh-runtime-rename-impact.md` for the full migration history.

## License

MIT
