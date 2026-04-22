# Personal Mercury Mesh — Skill Document

## What is a Personal Mercury Mesh?

A personal Mercury Mesh is a user-level collection of AI agents that travel with you across projects. Unlike project agents (defined in a project's `.mesh/` directory), personal agents live in your global config directory and are automatically discovered when you start a Mercury Mesh session.

## Current Status

This package does not currently ship personal-mesh discovery helpers or `mercury-mesh personal ...` / `mercury-mesh cast` CLI commands.

Treat personal meshes as an optional compatibility pattern for surfaces that already provide a resolved personal-agent directory or explicit personal-agent manifest.

## Directory Structure

```
~/.config/Mercury Mesh/personal-Mercury Mesh/    # Linux/macOS
%APPDATA%/Mercury Mesh/personal-Mercury Mesh/    # Windows
├── agents/
│   ├── {agent-name}/
│   │   ├── charter.md
│   │   └── history.md
│   └── ...
└── config.json                    # Optional: personal Mercury Mesh config
```

## How It Works

1. **Ambient Discovery:** When Mercury Mesh starts a session, it checks for a personal Mercury Mesh directory
2. **Merge:** Personal agents are merged into the session cast alongside project agents
3. **Ghost Protocol:** Personal agents can read project state but not write to it
4. **Kill Switch:** Set `MESH_NO_PERSONAL=1` to disable ambient discovery

## Compatibility Pattern

1. Only load personal agents when the active Mercury Mesh surface explicitly provides personal-agent input.
2. Merge personal agents additively with project agents.
3. Apply Ghost Protocol to every personal agent.
4. Skip silently when no personal-agent input exists.

## Ghost Protocol

See `templates/ghost-protocol.md` for the full rules. Key points:
- Personal agents advise; project agents execute
- No writes to project `.mesh/` state
- Transparent origin tagging in logs
- Project agents take precedence on conflicts

## Configuration

Optional `config.json` in the personal Mercury Mesh directory:
```json
{
  "defaultModel": "auto",
  "ghostProtocol": true,
  "agents": {}
}
```

## Environment Variables

If a host surface implements personal-mesh support, it may honor environment variables such as `MESH_NO_PERSONAL` and `MESH_PERSONAL_DIR`. They are not wired by this package's CLI today.
