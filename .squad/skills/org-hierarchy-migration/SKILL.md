---
name: "org-hierarchy-migration"
description: "Safely introduce hierarchical routing into an existing flat Squad repo"
domain: "architecture"
confidence: "medium"
source: "earned"
---

## Context
Use this when a flat Squad repo needs departments, leads, and escalation rules without breaking existing issue routing or roster parsing.

## Patterns
- Gate behavior behind `orgMode` in `.squad/config.json`.
- Make schemas additive: missing hierarchy fields must imply flat-mode behavior.
- Keep `## Members` and the first two columns (`Name`, `Role`) stable so workflows keep parsing the roster.
- Preserve `squad:{member}` as the workflow trigger; use `dept:*` only as routing metadata.
- Add migration and rollback artifacts alongside the new hierarchy schema.

## Examples
- `.squad/config.json` → `version: 2`, `orgMode`, `orgConfig`
- `.squad/org/structure.json` → departments, shared services, escalation rules
- `.github/workflows/squad-triage.yml` → assign `dept:{department}` labels without changing `squad:{member}` flow

## Anti-Patterns
- Reordering or renaming the `## Members` table header
- Making department labels the assignment trigger before workflows are redesigned
- Introducing a separate CEO agent instead of extending the coordinator
