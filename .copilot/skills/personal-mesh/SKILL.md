# Personal Mercury Mesh — Skill Document

## What is a Personal Mercury Mesh?

A personal Mercury Mesh is a user-level collection of AI agents that travel with you across projects. Unlike project agents (defined in a project's `.mesh/` directory), personal agents live in your global config directory and are automatically discovered when you start a Mercury Mesh session.

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

## Commands

- `Mercury Mesh personal init` — Bootstrap a personal Mercury Mesh directory
- `Mercury Mesh personal list` — List your personal agents
- `Mercury Mesh personal add {name} --role {role}` — Add a personal agent
- `Mercury Mesh personal remove {name}` — Remove a personal agent
- `Mercury Mesh cast` — Show the current session cast (project + personal)

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

- `MESH_NO_PERSONAL` — Set to any value to disable personal Mercury Mesh discovery
- `MESH_PERSONAL_DIR` — Override the default personal Mercury Mesh directory path
