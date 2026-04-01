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
  org/                     # Org-mode runtime: departments, backlog/state, contracts
  templates/               # Framework templates for agents, skills, workflows
.copilot/
  mcp-config.json          # MCP server configuration
```

## How It Works

- **Init Mode** — No team yet. Squad interviews you, casts a team, and scaffolds agent charters.
- **Team Mode** — Team exists. Squad routes tasks to the right agents, enforces review gates, and keeps a decision log.
- **Org Mode** — Optional hierarchical routing with departments. Enable via `orgMode: true` in `.squad/config.json`.
- **Org Runtime** — In Org Mode, departments use scoped backlog/state files and contract-first parallel work under coordinator supervision.

### Org Runtime Helper

Org Mode includes a zero-dependency reconcile helper template at `.squad/templates/org-runtime-reconcile.js`.
When installed into a live org repo as `.squad/org/reconcile.js`, it can scan department state for expired claims, stale heartbeats, and parallelism breaches, and optionally requeue expired packets.

Org Mode also includes a zero-dependency seeding helper at `.squad/templates/org-seed-runtime.js`.
When installed into a live org repo as `.squad/org/seed-runtime.js`, it can generate per-department `charter.md`, `backlog.md`, `state.json`, and declared contract files from `.squad/org/structure.json`.

To bridge GitHub issue triage into department work queues, use `.squad/templates/org-backlog-from-triage.js`.
When installed into a live org repo as `.squad/org/backlog-from-triage.js`, it converts triaged issues into queued department backlog packets.

For a single snapshot across all departments, use `.squad/templates/org-status.js`.
When installed into a live org repo as `.squad/org/status.js`, it reports backlog counts, active claims, stale heartbeat flags, and known contracts in one JSON summary.

## License

MIT
