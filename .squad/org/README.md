# Organizational Hierarchy

## How It Works
1. Set `orgMode: true` in `.squad/config.json`.
2. Define departments in `.squad/org/structure.json`.
3. The coordinator reads department domains and routes work directly to members.
4. Department leads are advisory. They are spawned for escalation or alignment, not every task.

## Current Shape
- **Analysis & Research** — lead: Danny; members: Rusty, Linus, Basher
- **Shared Services** — Scribe and Ralph stay org-scoped

## Migration
Follow `.squad/org/migration.md`. The rollout is additive:
- `squad:{member}` labels keep workflows working
- `dept:{department}` labels add routing metadata
- rollback is one flag flip: `orgMode: false`

## Operating Rules
- Keep `## Members` in `.squad/team.md`
- Keep Name and Role as the first two columns in the members table
- Do not repurpose `dept:*` labels as assignment triggers
