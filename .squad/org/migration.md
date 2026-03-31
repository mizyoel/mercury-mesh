# Org Migration Status

## Current Mode
- [x] Flat (default)
- [ ] Hierarchical (org mode enabled)

## Migration Checklist
- [x] config.json bumped to version 2
- [x] orgMode set to false (safe default)
- [x] structure.json created with at least one department
- [x] casting/registry.json extended with hierarchy fields
- [x] routing.md updated with hierarchical routing table
- [x] squad.agent.md updated with org-mode routing section
- [x] Workflows updated to understand dept:* labels
- [x] sync-squad-labels.yml generates dept:* labels
- [x] team.md extended with department column
- [ ] One full issue routed through hierarchical path (validation)
- [ ] orgMode set to true (go live)

## Rollback
Set `orgMode: false` in `.squad/config.json`. The coordinator falls back to flat routing and ignores `.squad/org/` artifacts without deleting them.
