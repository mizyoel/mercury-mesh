# Skill: nap

> Context hygiene — compress, prune, archive .mesh/ state

## What It Does

Reclaims context window budget by compressing agent histories, pruning old logs,
archiving stale decisions, and cleaning orphaned inbox files.

## When To Use

- Before heavy fan-out work (many agents will spawn)
- When history.md files exceed 15KB
- When .mesh/ total size exceeds 1MB
- After long-running sessions or sprints

## Invocation

- CLI: `Mercury Mesh nap` / `Mercury Mesh nap --deep` / `Mercury Mesh nap --dry-run`
- REPL: `/nap` / `/nap --dry-run` / `/nap --deep`

## Confidence

medium — Confirmed by team vote (4-1) and initial implementation
