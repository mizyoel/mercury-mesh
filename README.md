# Squad Org

A clean [Squad](https://github.com/features/copilot) organization repo — ready for Init Mode.

## What Is This?

This repo contains the **Squad framework**: an AI team orchestration system that lives in your repository. When you start a session, Squad will propose a team of specialist agents tailored to your project, then coordinate their work.

## Getting Started

1. Open this repo in VS Code with GitHub Copilot enabled.
2. Start a chat with `@squad` — it will detect the empty roster and enter **Init Mode**.
3. Describe what you're building. Squad will propose a team.
4. Confirm the roster, and the team is hired.

## Structure

```
.github/
  agents/squad.agent.md   # Coordinator governance (the brain)
  workflows/               # GitHub Actions for issue triage, labels, heartbeat
.squad/
  config.json              # Version & feature flags
  team.md                  # Team roster (empty = Init Mode)
  routing.md               # Work routing rules
  ceremonies.md            # Design review & retro triggers
  decisions.md             # Decision log
  templates/               # Framework templates for agents, skills, workflows
.copilot/
  mcp-config.json          # MCP server configuration
```

## How It Works

- **Init Mode** — No team yet. Squad interviews you, casts a team, and scaffolds agent charters.
- **Team Mode** — Team exists. Squad routes tasks to the right agents, enforces review gates, and keeps a decision log.
- **Org Mode** — Optional hierarchical routing with departments. Enable via `orgMode: true` in `.squad/config.json`.

## License

MIT
