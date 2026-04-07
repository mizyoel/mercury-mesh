---
name: "economy-mode"
description: "Shifts Layer 3 model selection to cost-optimized alternatives when economy mode is active."
---

## SCOPE

✅ THIS SKILL PRODUCES:
- A modified Layer 3 model selection table applied when economy mode is active
- `economyMode: true` written to `.mesh/config.json` when activated persistently
- Spawn acknowledgments with `💰` indicator when economy mode is active

❌ THIS SKILL DOES NOT PRODUCE:
- Code, tests, or documentation
- Cost reports or billing artifacts
- Changes to Layer 0, Layer 1, or Layer 2 resolution (user intent always wins)

## Context

Economy mode shifts Layer 3 (Task-Aware Auto-Selection) to lower-cost alternatives. It does NOT override persistent config (`defaultModels`, `defaultModel`, `agentModelOverrides`) or per-agent charter preferences — those represent explicit user intent and always take priority. Economy routes must come from config rather than hardcoded model IDs.

Use this skill when the user wants to reduce costs across an entire session or permanently, without manually specifying models for each agent.

## Activation Methods

| Method | How |
|--------|-----|
| Session phrase | "use economy mode", "save costs", "go cheap", "reduce costs" |
| Persistent config | `"economyMode": true` in `.mesh/config.json` |
| CLI flag | `Mercury Mesh --economy` |

**Deactivation:** "turn off economy mode", "disable economy mode", or remove `economyMode` from `config.json`.

## Economy Model Selection Table

When economy mode is **active**, Layer 3 auto-selection uses `modelRouting.economy.taskTypes` and `modelRouting.economy.fallbacks` from config. If those keys are absent, reuse the normal `modelRouting` block rather than falling back to hardcoded model IDs.

## AGENT WORKFLOW

### On Session Start

1. READ the active runtime config (`.mesh/config.json` or `.mesh/config.json`)
2. CHECK for `economyMode: true` — if present, activate economy mode for the session
3. STORE economy mode state in session context

### On User Phrase Trigger

**Session-only (no config change):** "use economy mode", "save costs", "go cheap"

1. SET economy mode active for this session
2. ACKNOWLEDGE: `✅ Economy mode active — using cost-optimized models this session. (Layer 0 and Layer 2 preferences still apply)`

**Persistent:** "always use economy mode", "save economy mode"

1. WRITE `economyMode: true` to the active `config.json` (merge, don't overwrite other fields)
2. ACKNOWLEDGE: `✅ Economy mode saved — cost-optimized models will be used until disabled.`

### On Every Agent Spawn (Economy Mode Active)

1. CHECK Layer 0 first (`agentModelOverrides`, `defaultModels`, `defaultModel`) — if set, use that. Economy mode does NOT override Layer 0.
2. CHECK Layer 1 (session directive for a specific model) — if set, use that. Economy mode does NOT override explicit session directives.
3. CHECK Layer 2 (charter preference) — if set, use that. Economy mode does NOT override charter preferences.
4. APPLY `modelRouting.economy` at Layer 3 instead of normal `modelRouting` when present.
5. INCLUDE `💰` in spawn acknowledgment: `🔧 {Name} ({model} · 💰 economy) — {task}`

### On Deactivation

**Trigger phrases:** "turn off economy mode", "disable economy mode", "use normal models"

1. REMOVE `economyMode` from the active `config.json` (if it was persisted)
2. CLEAR session economy mode state
3. ACKNOWLEDGE: `✅ Economy mode disabled — returning to standard model selection.`

### STOP

After updating economy mode state and including the `💰` indicator in spawn acknowledgments, this skill is done. Do NOT:
- Change Layer 0, Layer 1, or Layer 2 model choices
- Override charter-specified models
- Generate cost reports or comparisons
- Fall back to premium models via economy mode (economy mode never bumps UP)

## Config Schema

`.mesh/config.json` economy-related fields:

```json
{
  "version": 1,
  "economyMode": true
}
```

- `economyMode` — when `true`, Layer 3 uses the economy table. Optional; absent = economy mode off.
- Combines with `defaultModels`, `defaultModel`, and `agentModelOverrides` — Layer 0 always wins.

## Anti-Patterns

- **Don't override Layer 0 in economy mode.** If the user set Layer 0 model overrides in `config.json`, they want that chain honored. Economy mode only affects Layer 3 auto-selection.
- **Don't silently apply economy mode.** Always acknowledge when activated or deactivated.
- **Don't treat economy mode as permanent by default.** Session phrases activate session-only; only "always" or `config.json` persist it.
- **Don't invent downgrade targets.** Architecture and security reviews must follow the configured economy lead route in `config.json`; do NOT hardcode a premium-to-standard downgrade in the prompt.
